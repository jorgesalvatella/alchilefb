'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/firebase/provider';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

// Helper para formatear teléfono con espacios visuales
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 10);
  if (limited.length <= 3) return limited;
  if (limited.length <= 6) return `${limited.slice(0, 3)} ${limited.slice(3)}`;
  return `${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
};

export default function CompletarPerfilPage() {
  const { user, userData } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si el usuario ya tiene teléfono, redirigir
    if (userData?.phoneNumber) {
      router.push('/');
    }
  }, [userData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formato
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError('El teléfono debe tener exactamente 10 dígitos');
      return;
    }

    if (!user) {
      setError('No se pudo identificar al usuario');
      return;
    }

    setIsLoading(true);

    try {
      // Formatear a E.164
      const formattedPhone = `+52${cleaned}`;

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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el teléfono');
      }

      toast.success('Teléfono actualizado exitosamente');

      // Redirigir a la página principal
      router.push('/');

    } catch (error) {
      console.error('Error updating phone:', error);
      setError((error as Error).message || 'Error al actualizar el teléfono');
      toast.error('Error al actualizar el teléfono');
    } finally {
      setIsLoading(false);
    }
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
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white">
                Número de Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="998 123 4567"
                value={formatPhoneNumber(phoneNumber)}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '');
                  setPhoneNumber(cleaned);
                  setError('');
                }}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500"
                required
              />
              <p className="text-xs text-white/50">
                10 dígitos sin espacios ni guiones
              </p>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || phoneNumber.replace(/\D/g, '').length !== 10}
              className="w-full font-headline text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? 'Guardando...' : 'Continuar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
