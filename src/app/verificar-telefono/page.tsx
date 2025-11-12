'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import VerificationCodeInput from '@/components/verification/VerificationCodeInput';
import VerificationTimer from '@/components/verification/VerificationTimer';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

// Declarar tipos para window
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function VerificarTelefonoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/menu';
  const { user, userData, isUserLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const [inputCode, setInputCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [smsSent, setSmsSent] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  // Verificar que el usuario tenga phoneNumber antes de generar código
  useEffect(() => {
    if (user && !isUserLoading && userData) {
      // Si no tiene phoneNumber, redirigir a completar-perfil
      if (!userData.phoneNumber) {
        toast({
          title: 'Teléfono requerido',
          description: 'Primero debes registrar tu número de teléfono',
          variant: 'destructive',
        });
        router.push(`/completar-perfil?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      // Inicializar reCAPTCHA
      initializeRecaptcha();
    }
  }, [user, isUserLoading, userData]);

  const initializeRecaptcha = () => {
    if (!auth || typeof window === 'undefined') return;

    try {
      // Limpiar reCAPTCHA anterior si existe
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }

      // Crear nuevo reCAPTCHA v2 invisible
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: string) => {
          console.log('reCAPTCHA resolved:', response);
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA expired');
          toast({
            title: 'Sesión expirada',
            description: 'Por favor, recarga la página e intenta de nuevo',
            variant: 'destructive',
          });
        }
      });

      setRecaptchaReady(true);
      console.log('reCAPTCHA initialized successfully');
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
      toast({
        title: 'Error de configuración',
        description: 'No se pudo inicializar el sistema de verificación',
        variant: 'destructive',
      });
    }
  };

  const generateCode = async () => {
    if (!user || !userData?.phoneNumber || !window.recaptchaVerifier) {
      toast({
        title: 'Error',
        description: 'Debes estar autenticado y tener un teléfono registrado',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setInputCode('');
    setAttemptsRemaining(3);

    try {
      // Verificar rate limiting en backend
      const token = await user.getIdToken();
      const rateLimitResponse = await fetch('/api/verification/check-rate-limit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!rateLimitResponse.ok) {
        const errorData = await rateLimitResponse.json();
        throw new Error(errorData.message || 'Demasiados intentos');
      }

      const rateLimitData = await rateLimitResponse.json();

      if (!rateLimitData.allowed) {
        toast({
          title: 'Límite alcanzado',
          description: rateLimitData.message || 'Demasiados intentos. Intenta más tarde.',
          variant: 'destructive',
        });
        setIsGenerating(false);
        return;
      }

      // Enviar SMS con Firebase Phone Auth
      const phoneNumber = userData.phoneNumber; // Ya está en formato E.164 (+52XXXXXXXXXX)
      const appVerifier = window.recaptchaVerifier;

      console.log('Sending SMS to:', phoneNumber);

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);

      // Guardar confirmation result para verificar después
      window.confirmationResult = confirmationResult;

      // Configurar expiración (10 minutos)
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
      setExpiresAt(expirationTime);
      setSmsSent(true);

      // También enviar notificación FCM si el usuario tiene app móvil
      try {
        await fetch('/api/verification/send-fcm-notification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('FCM notification sent');
      } catch (fcmError) {
        console.warn('Could not send FCM notification:', fcmError);
        // No es crítico, continuar
      }

      toast({
        title: '📱 SMS Enviado',
        description: 'Revisa tu teléfono para el código de verificación',
      });

    } catch (error: any) {
      console.error('Error sending SMS:', error);

      let errorMessage = 'No se pudo enviar el SMS. Intenta de nuevo.';

      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Número de teléfono inválido';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'Se ha excedido el límite de SMS. Intenta mañana.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Reinicializar reCAPTCHA si falló
      initializeRecaptcha();
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyCode = async () => {
    const cleanCode = inputCode.trim();

    if (cleanCode.length !== 6) {
      toast({
        title: 'Código incompleto',
        description: 'Ingresa los 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !window.confirmationResult) {
      toast({
        title: 'Error',
        description: 'Sesión expirada. Genera un nuevo código.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Confirmar código con Firebase
      const result = await window.confirmationResult.confirm(cleanCode);

      console.log('Phone verification successful:', result.user.uid);

      // Llamar al backend para marcar como verificado
      const token = await user.getIdToken();
      const response = await fetch('/api/verification/mark-verified', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estado de verificación');
      }

      toast({
        title: '¡Teléfono verificado!',
        description: 'Ya puedes realizar pedidos',
      });

      // Forzar refresh del token antes de redirigir
      await user.getIdTokenResult(true);

      // Marcar que el teléfono acaba de verificarse
      sessionStorage.setItem('phoneJustVerified', 'true');

      // Redirigir
      router.push(returnTo);

    } catch (error: any) {
      console.error('Invalid code:', error);

      setAttemptsRemaining(prev => prev - 1);
      setInputCode('');

      let errorMessage = 'Código incorrecto. Verifica e intenta de nuevo.';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Código incorrecto';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Código expirado. Genera uno nuevo.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Si no quedan intentos, generar nuevo código
      if (attemptsRemaining <= 1) {
        setTimeout(() => {
          setSmsSent(false);
          window.confirmationResult = undefined;
          toast({
            title: 'Genera un nuevo código',
            description: 'Has agotado los intentos para este código',
            variant: 'destructive',
          });
        }, 2000);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExpire = () => {
    toast({
      title: 'Código expirado',
      description: 'Genera un nuevo código para continuar',
      variant: 'destructive',
    });
    setSmsSent(false);
    window.confirmationResult = undefined;
  };

  // Loading state
  if (isUserLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </main>
    );
  }

  // Not authenticated
  if (!user) {
    router.push('/ingresar');
    return null;
  }

  return (
    <main className="min-h-screen bg-black p-4 pt-24 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Verifica tu Teléfono
            </h1>
            <p className="text-white/60">
              Para realizar pedidos, verifica tu número de teléfono
            </p>
          </div>

          {/* Información del teléfono */}
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
            <p className="text-white text-sm mb-1">Número registrado:</p>
            <p className="text-white font-bold text-lg">{userData?.phoneNumber}</p>
          </div>

          {/* Estado del SMS */}
          {smsSent && expiresAt && (
            <>
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">✅</span>
                  <div>
                    <p className="text-white font-semibold">SMS Enviado</p>
                    <p className="text-white/70 text-sm">Revisa tu teléfono para el código</p>
                  </div>
                </div>
              </div>

              <VerificationTimer
                expiresAt={expiresAt}
                onExpire={handleExpire}
              />
            </>
          )}

          {/* Input para ingresar código */}
          {smsSent && (
            <div className="mb-6">
              <label className="block text-white/80 mb-3 text-sm text-center">
                Ingresa el código recibido por SMS:
              </label>
              <VerificationCodeInput
                value={inputCode}
                onChange={setInputCode}
                disabled={isVerifying || isGenerating}
              />
            </div>
          )}

          {/* Intentos restantes */}
          {attemptsRemaining < 3 && attemptsRemaining > 0 && smsSent && (
            <p className="text-orange-400 text-sm mb-4 text-center">
              Intentos restantes: {attemptsRemaining}/3
            </p>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            {smsSent ? (
              <>
                <Button
                  onClick={verifyCode}
                  disabled={isVerifying || isGenerating || inputCode.length !== 6}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
                  size="lg"
                >
                  {isVerifying ? 'Verificando...' : 'Verificar Código'}
                </Button>

                <Button
                  onClick={() => {
                    setSmsSent(false);
                    window.confirmationResult = undefined;
                    setInputCode('');
                    setAttemptsRemaining(3);
                  }}
                  disabled={isGenerating || isVerifying}
                  variant="outline"
                  className="sm:w-auto border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                  size="lg"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                onClick={generateCode}
                disabled={isGenerating || !recaptchaReady}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
                size="lg"
              >
                {isGenerating ? 'Enviando SMS...' : 'Enviar Código por SMS'}
              </Button>
            )}
          </div>

          {/* Info adicional */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg">
            <p className="text-white/60 text-xs text-center">
              📱 Recibirás un SMS con un código de 6 dígitos<br />
              ⏱️ El código expira en 10 minutos<br />
              🔒 Máximo 3 intentos de verificación por código
            </p>
          </div>

        </div>
      </div>

      {/* Contenedor invisible para reCAPTCHA */}
      <div id="recaptcha-container"></div>
    </main>
  );
}
