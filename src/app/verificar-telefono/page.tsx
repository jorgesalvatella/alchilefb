'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import VerificationCodeDisplay from '@/components/verification/VerificationCodeDisplay';
import VerificationCodeInput from '@/components/verification/VerificationCodeInput';
import VerificationTimer from '@/components/verification/VerificationTimer';

export default function VerificarTelefonoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/menu';
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [strategy, setStrategy] = useState<'fcm_mobile' | 'display' | null>(null);

  // Generar código al montar (Decisión 2A: generar nuevo automáticamente)
  useEffect(() => {
    if (user && !isUserLoading) {
      generateCode();
    }
  }, [user, isUserLoading]);

  const generateCode = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes estar autenticado',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setInputCode(''); // Limpiar input al generar nuevo código
    setAttemptsRemaining(3); // Resetear intentos

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/verification/generate-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al generar código');
      }

      const data = await response.json();

      // Manejar estrategia de envío
      setStrategy(data.strategy);
      setExpiresAt(new Date(data.expiresAt));

      if (data.strategy === 'fcm_mobile') {
        // Código enviado a móvil - NO mostrarlo en pantalla
        setGeneratedCode('');
        toast({
          title: '📱 Código enviado a tu móvil',
          description: data.message || 'Revisa tu dispositivo móvil para el código de verificación',
        });
      } else {
        // Mostrar código en pantalla (display)
        setGeneratedCode(data.code || '');
        toast({
          title: 'Código generado',
          description: data.message || 'Ingresa el código que ves abajo',
        });
      }

    } catch (error: any) {
      console.error('Error generating code:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo generar el código',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyCode = async () => {
    // Limpiar y normalizar el código ingresado
    const cleanCode = inputCode.trim();

    if (cleanCode.length !== 6) {
      toast({
        title: 'Código incompleto',
        description: 'Ingresa los 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes estar autenticado',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    console.log('Verifying code:', {
      original: inputCode,
      cleaned: cleanCode,
      length: cleanCode.length
    });

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/verification/verify-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: cleanCode }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '¡Teléfono verificado!',
          description: 'Ya puedes realizar pedidos',
        });

        // Decisión 3B: Forzar refresh del token antes de redirigir
        await user.getIdTokenResult(true);

        // Marcar que el teléfono acaba de verificarse para refrescar userData en /pago
        sessionStorage.setItem('phoneJustVerified', 'true');

        // Redirigir después de actualizar token
        router.push(returnTo);
      } else {
        // Código incorrecto
        setAttemptsRemaining(data.attemptsRemaining || 0);
        setInputCode(''); // Limpiar input

        toast({
          title: 'Código incorrecto',
          description: data.attemptsRemaining > 0
            ? `Te quedan ${data.attemptsRemaining} intentos`
            : 'No quedan intentos. Genera un nuevo código.',
          variant: 'destructive',
        });

        // Si no quedan intentos, generar nuevo código automáticamente
        if (data.attemptsRemaining === 0) {
          setTimeout(() => {
            generateCode();
          }, 2000);
        }
      }

    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo verificar el código',
        variant: 'destructive',
      });
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
              {strategy === 'fcm_mobile'
                ? 'Revisa tu dispositivo móvil para el código de verificación'
                : 'Para realizar pedidos, ingresa el código que ves abajo'
              }
            </p>
          </div>

          {/* Código Visual (solo si strategy = display) */}
          {strategy === 'display' && generatedCode && (
            <>
              <VerificationCodeDisplay code={generatedCode} />

              {/* Timer */}
              {expiresAt && (
                <VerificationTimer
                  expiresAt={expiresAt}
                  onExpire={handleExpire}
                />
              )}
            </>
          )}

          {/* Timer independiente (si strategy = fcm_mobile) */}
          {strategy === 'fcm_mobile' && expiresAt && !generatedCode && (
            <>
              {/* Mensaje visual para FCM */}
              <div className="mb-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📱</span>
                  <div>
                    <p className="text-white font-semibold">Código enviado a tu móvil</p>
                    <p className="text-white/70 text-sm">Revisa las notificaciones de tu dispositivo</p>
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
          <div className="mb-6">
            <label className="block text-white/80 mb-3 text-sm text-center">
              Ingresa el código:
            </label>
            <VerificationCodeInput
              value={inputCode}
              onChange={setInputCode}
              disabled={isVerifying || isGenerating}
            />
          </div>

          {/* Intentos restantes */}
          {attemptsRemaining < 3 && attemptsRemaining > 0 && (
            <p className="text-orange-400 text-sm mb-4 text-center">
              Intentos restantes: {attemptsRemaining}/3
            </p>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={verifyCode}
              disabled={isVerifying || isGenerating || inputCode.length !== 6}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
              size="lg"
            >
              {isVerifying ? 'Verificando...' : 'Verificar Código'}
            </Button>

            <Button
              onClick={generateCode}
              disabled={isGenerating || isVerifying}
              variant="outline"
              className="sm:w-auto border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
              size="lg"
            >
              {isGenerating ? 'Generando...' : 'Nuevo Código'}
            </Button>
          </div>

        </div>
      </div>
    </main>
  );
}
