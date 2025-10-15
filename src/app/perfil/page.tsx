'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, signOut } from 'firebase/auth';
import { Pen, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  // State for data fetched from API
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the editing form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/ingresar');
    }
  }, [user, isUserLoading, router]);

  // Effect to fetch data from our API
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const token = await user.getIdToken();
          const response = await fetch('/api/me/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch profile: ${response.statusText}`);
          }

          const profileData = await response.json();
          setUserProfile(profileData);

          // Initialize form state correctly
          setFirstName(profileData.firstName || '');
          setLastName(profileData.lastName || '');
          setPhoneNumber(profileData.phoneNumber || '');

        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, phoneNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Server error response:', errorData);
        throw new Error(errorData.message || `Failed to update profile (${response.status})`);
      }

      setUserProfile(prev => prev ? { ...prev, firstName, lastName, phoneNumber } : null);
      setIsEditing(false);
      alert('Perfil actualizado correctamente');
    } catch (error) {
      console.error("Error updating profile: ", error);
      alert(`Error al actualizar perfil: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  if (isLoading || isUserLoading || !user) {
    return (
        <div className="relative min-h-screen bg-black text-white pt-32">
            <div className="container mx-auto px-4 pb-12 md:pb-20">
                <Skeleton data-testid="loading-skeleton" className="h-16 w-1/2 mx-auto mb-12 bg-white/10" />
                <div className="grid md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <Skeleton data-testid="loading-skeleton" className="h-12 w-full mb-4 bg-white/10" />
                        <Skeleton data-testid="loading-skeleton" className="h-12 w-full bg-white/10" />
                    </div>
                    <div className="md:col-span-3">
                        <Skeleton data-testid="loading-skeleton" className="h-64 w-full bg-white/10 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // Robust display name calculation
  const displayName = userProfile?.firstName || user.displayName?.split(' ')?.[0] || '';
  const displayLastName = userProfile?.lastName || user.displayName?.split(' ')?.[1] || '';
  const displayEmail = userProfile?.email || user.email || '';
  const displayPhone = userProfile?.phoneNumber || '';
  const displayPhotoUrl = userProfile?.profilePictureUrl || user.photoURL;

  return (
    <div className="relative min-h-screen bg-black text-white pt-32">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative container mx-auto px-4 pb-12 md:pb-20">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Mi Perfil
                </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Administra tu información personal.
            </p>
        </div>

        <div className="max-w-2xl mx-auto">
            <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold">{displayName} {displayLastName}</h2>
                    <p className="text-white/60">{displayEmail}</p>
                    <p className="text-white/60">{displayPhone}</p>
                </div>

                {isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">Nombre</Label>
                                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-white/5 border-white/20" />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Apellido</Label>
                                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-white/5 border-white/20" />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input id="phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="bg-white/5 border-white/20" />
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={handleProfileUpdate} className="bg-orange-500 hover:bg-orange-600">Guardar Cambios</Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)} className="bg-white/10 border-white/20 hover:bg-white/20">
                        <Pen className="mr-2 h-4 w-4" /> Editar Perfil
                    </Button>
                )}

                <Separator className="bg-white/20" />

                <Button onClick={handleSignOut} className="w-full bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-lg py-6 hover:scale-105 transition-transform duration-300">
                    Cerrar Sesión
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
