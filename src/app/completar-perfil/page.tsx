'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CountryPhoneInput, COUNTRIES, type Country } from '@/components/ui/country-phone-input';

export default function CompletarPerfilPage() {
  const { user, userData } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/menu';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // México por defecto
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  useEffect(() => {
    // Si el usuario ya tiene teléfono, redirigir
    if (userData?.phoneNumber) {
      router.push('/');
    }
  }, [userData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formato según el país seleccionado
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== selectedCountry.digits) {
      setError(`El teléfono debe tener exactamente ${selectedCountry.digits} dígitos para ${selectedCountry.name}`);
      return;
    }

    if (!user) {
      setError('No se pudo identificar al usuario');
      return;
    }

    setIsLoading(true);

    try {
      // Formatear a E.164
      const formattedPhone = `${selectedCountry.dialCode}${cleaned}`;

      // Actualizar Firestore
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        phoneNumber: formattedPhone,
        updatedAt: new Date().toISOString(),
      });

      // Llamar al backend para actualizar Firebase Auth
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/usuarios/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: cleaned,
          countryCode: selectedCountry.code,
          dialCode: selectedCountry.dialCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el teléfono');
      }

      toast.success('Teléfono actualizado exitosamente');

      // Mostrar modal de verificación
      setShowVerificationDialog(true);

    } catch (error) {
      console.error('Error updating phone:', error);
      setError((error as Error).message || 'Error al actualizar el teléfono');
      toast.error('Error al actualizar el teléfono');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyNow = () => {
    router.push(`/verificar-telefono?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleVerifyLater = () => {
    router.push(returnTo);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4">
      {/* Efectos de fondo */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-white mb-3">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                Completa tu
              </span>
              <span className="block text-6xl mt-1 bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">
                Perfil
              </span>
            </h1>
            <p className="text-white/60 mt-4">
              Para continuar, necesitamos que agregues tu número de teléfono.
            </p>
            <p className="text-white/40 text-sm mt-2">
              Se usará para verificación y comunicación importante.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <CountryPhoneInput
              value={phoneNumber}
              onChange={(value) => {
                setPhoneNumber(value);
                setError('');
              }}
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              disabled={isLoading}
              error={error}
            />

            <Button
              type="submit"
              disabled={isLoading || phoneNumber.replace(/\D/g, '').length !== selectedCountry.digits}
              className="w-full font-headline text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? 'Guardando...' : 'Continuar'}
            </Button>
          </form>
        </div>
      </div>

      {/* Modal de Verificación */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="bg-gray-900 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
              ✅ Teléfono Guardado
            </DialogTitle>
            <DialogDescription className="text-white/70 text-base">
              Tu número de teléfono ha sido registrado exitosamente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-4">
              <p className="text-white font-semibold mb-2">🔒 Verificación de Seguridad</p>
              <p className="text-white/80 text-sm">
                Para mayor seguridad y poder realizar pedidos, te recomendamos verificar tu teléfono ahora.
              </p>
            </div>
            <p className="text-white/60 text-sm">
              Recibirás un código de verificación en tu dispositivo. El proceso toma menos de 1 minuto.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleVerifyLater}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Verificar Después
            </Button>
            <Button
              onClick={handleVerifyNow}
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform"
            >
              Verificar Ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
