'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, signOut } from 'firebase/auth';
import { Pen, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

// Helper functions for password strength
const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
};

const getPasswordStrengthColor = (password: string) => {
  const strength = getPasswordStrength(password);
  if (strength < 50) return "bg-red-500";
  if (strength < 75) return "bg-yellow-500";
  return "bg-green-500";
};

const getPasswordStrengthText = (password: string) => {
  const strength = getPasswordStrength(password);
  if (strength < 50) return "Débil";
  if (strength < 75) return "Media";
  return "Fuerte";
};

function ProfilePage({ user }: WithAuthProps) {
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

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
      toast({
        title: "Éxito",
        description: "Perfil actualizado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({
        title: "Error",
        description: `Error al actualizar perfil: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    setPasswordChangeError(null);

    // Frontend validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordChangeError("Todos los campos de contraseña son obligatorios.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError("La nueva contraseña y la confirmación no coinciden.");
      return;
    }
    // Robust password validation (min 8 chars, 1 number, 1 uppercase, 1 lowercase)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordChangeError("La nueva contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Server error response:', errorData);
        throw new Error(errorData.message || `Failed to change password (${response.status})`);
      }

      toast({
        title: "Éxito",
        description: "Contraseña actualizada correctamente. Por seguridad, se recomienda cerrar sesión y volver a iniciar.",
        variant: "default",
      });
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error("Error changing password: ", error);
      toast({
        title: "Error",
        description: `Error al cambiar contraseña: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
        variant: "destructive",
      });
    }
  };

  const { toast } = useToast();

  if (isLoading) {
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
  const displayName = userProfile?.firstName || user.displayName?.split(' ')[0] || '';
  const displayLastName = userProfile?.lastName || user.displayName?.split(' ')[1] || '';
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
                        <Separator className="bg-white/20 my-6" />
                        <h3 className="text-xl font-semibold">Cambiar Contraseña</h3>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="currentPassword">Contraseña Actual</Label>
                                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-white/5 border-white/20" />
                            </div>
                            <div>
                                <Label htmlFor="newPassword">Nueva Contraseña</Label>
                                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white/5 border-white/20" />
                                <div className="mt-2 text-sm text-white/70 space-y-1">
                                  <p className={newPassword.length >= 8 ? "text-green-400" : ""}>
                                    • Al menos 8 caracteres
                                  </p>
                                  <p className={/[A-Z]/.test(newPassword) ? "text-green-400" : ""}>
                                    • Al menos una letra mayúscula
                                  </p>
                                  <p className={/[a-z]/.test(newPassword) ? "text-green-400" : ""}>
                                    • Al menos una letra minúscula
                                  </p>
                                  <p className={/[0-9]/.test(newPassword) ? "text-green-400" : ""}>
                                    • Al menos un número
                                  </p>
                                </div>
                                <div className="mt-2">
                                  <div className="h-2 w-full rounded-full bg-gray-700">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor(newPassword)}`} 
                                      style={{ width: `${getPasswordStrength(newPassword)}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-sm text-white/70 mt-1">
                                    Nivel de seguridad: {getPasswordStrengthText(newPassword)}
                                  </p>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña</Label>
                                <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="bg-white/5 border-white/20" />
                            </div>
                            {passwordChangeError && <p className="text-red-500 text-sm">{passwordChangeError}</p>}
                            <Button onClick={handlePasswordChange} className="w-full bg-green-600 hover:bg-green-700">Actualizar Contraseña</Button>
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={handleProfileUpdate} className="bg-orange-500 hover:bg-orange-600">Guardar Cambios de Perfil</Button>
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

export default withAuth(ProfilePage, 'user');