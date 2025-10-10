'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, signOut } from 'firebase/auth';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, addDoc, deleteDoc } from 'firebase/firestore';
import { Pen, Trash2, User as UserIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const userProfileRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const addressesCollection = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/delivery_addresses`) : null),
    [firestore, user]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection(addressesCollection);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (userProfile) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  };

  const handleProfileUpdate = async () => {
    if (!userProfileRef) return;
    try {
      await updateDoc(userProfileRef, { firstName, lastName, phone });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile: ", error);
    }
  };

  if (isUserLoading || isProfileLoading || !user) {
    return (
        <div className="relative min-h-screen bg-black text-white pt-32">
            <div className="container mx-auto px-4 pb-12 md:pb-20">
                <Skeleton className="h-16 w-1/2 mx-auto mb-12 bg-white/10" />
                <div className="grid md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <Skeleton className="h-12 w-full mb-4 bg-white/10" />
                        <Skeleton className="h-12 w-full bg-white/10" />
                    </div>
                    <div className="md:col-span-3">
                        <Skeleton className="h-64 w-full bg-white/10 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
  }

  const displayName = userProfile?.firstName || user.displayName?.split(' ')[0] || '';
  const displayLastName = userProfile?.lastName || user.displayName?.split(' ')[1] || '';
  const displayEmail = userProfile?.email || user.email || '';
  const displayPhone = userProfile?.phone || '';
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
            <h1 className="text-5xl md:text-7xl font-black text-white mb-3">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Mi Cuenta
                </span>
            </h1>
        </div>

        <div className="grid md:grid-cols-4 gap-8 items-start">
            <div className="md:col-span-1 space-y-2">
                <Button onClick={() => setActiveTab('profile')} variant={activeTab === 'profile' ? 'default' : 'ghost'} className={cn("w-full justify-start gap-2 font-headline text-lg", activeTab === 'profile' && "bg-white/10 text-white")}>
                    <UserIcon className="h-5 w-5" /> Perfil
                </Button>
                <Button onClick={() => setActiveTab('addresses')} variant={activeTab === 'addresses' ? 'default' : 'ghost'} className={cn("w-full justify-start gap-2 font-headline text-lg", activeTab === 'addresses' && "bg-white/10 text-white")}>
                    <MapPin className="h-5 w-5" /> Direcciones
                </Button>
            </div>

            <div className="md:col-span-3">
                {activeTab === 'profile' && (
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
                                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/20" />
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
                )}

                {activeTab === 'addresses' && (
                    <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
                        <h2 className="text-3xl font-bold mb-4">Mis Direcciones</h2>
                        {isLoadingAddresses ? (
                            <p>Cargando direcciones...</p>
                        ) : (
                            <div className="space-y-4">
                                {addresses?.map((address: any) => (
                                    <div key={address.id} className="flex justify-between items-start p-4 rounded-lg border border-white/20 bg-white/5">
                                        <div>
                                            <p className="font-semibold">{address.street}, {address.interior}</p>
                                            <p className="text-white/70">{address.neighborhood}, {address.city}, {address.state} {address.postalCode}</p>
                                            <p className="text-white/70">{address.phone}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-orange-400"><Pen className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button className="w-full bg-orange-500 hover:bg-orange-600">Añadir Nueva Dirección</Button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
