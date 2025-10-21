'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida.'),
  newPassword: z.string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'La nueva contraseña debe contener al menos una letra mayúscula.')
    .regex(/[a-z]/, 'La nueva contraseña debe contener al menos una letra minúscula.')
    .regex(/[0-9]/, 'La nueva contraseña debe contener al menos un número.'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

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

export default function ChangePasswordPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = form.watch('newPassword');

  const onSubmit = async (values: z.infer<typeof changePasswordSchema>) => {
    if (!user || !user.email) {
      toast({ title: 'Error', description: 'Usuario no encontrado o sin email.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Re-authenticate the user with their current (temporary) password
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. If re-authentication is successful, update to the new password
      await updatePassword(user, values.newPassword);

      // 3. Force-refresh the token AFTER password change to get a valid one
      const token = await user.getIdToken(true);

      // 4. Notify the backend to clear the forcePasswordChange flag
      const response = await fetch('/api/me/password-changed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // This error is not critical for the user, but good to know for the backend.
        console.error('Failed to clear forcePasswordChange flag.');
        throw new Error('No se pudo finalizar el proceso de cambio de clave. Intente de nuevo.');
      }

      // Step 4: Force a refresh of the user token to get the latest state
      await user.getIdToken(true);

      toast({ title: 'Éxito', description: 'Tu contraseña ha sido cambiada. Serás redirigido.' });
      
      // Step 5: Redirect AFTER everything is confirmed
      router.push('/control');

    } catch (error: any) {
      let errorMessage = 'Ocurrió un error inesperado.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'La contraseña temporal no es correcta. Por favor, verifícala.';
      }
      toast({ title: 'Error al cambiar la contraseña', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4 pt-24">
      <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-white mb-3">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                Cambiar Contraseña
              </span>
            </h1>
            <p className="text-white/60">Debes cambiar tu contraseña temporal antes de continuar.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Contraseña Temporal" 
                        {...field} 
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Nueva Contraseña" 
                        {...field} 
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="mt-2 text-sm text-white/70 space-y-1">
                      <p className={newPasswordValue.length >= 8 ? "text-green-400" : ""}>
                        • Al menos 8 caracteres
                      </p>
                      <p className={/[A-Z]/.test(newPasswordValue) ? "text-green-400" : ""}>
                        • Al menos una letra mayúscula
                      </p>
                      <p className={/[a-z]/.test(newPasswordValue) ? "text-green-400" : ""}>
                        • Al menos una letra minúscula
                      </p>
                      <p className={/[0-9]/.test(newPasswordValue) ? "text-green-400" : ""}>
                        • Al menos un número
                      </p>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 w-full rounded-full bg-gray-700">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor(newPasswordValue)}`} 
                          style={{ width: `${getPasswordStrength(newPasswordValue)}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-white/70 mt-1">
                        Nivel de seguridad: {getPasswordStrengthText(newPasswordValue)}
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirmar Nueva Contraseña" 
                        {...field} 
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full font-headline text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300"
                disabled={isLoading}
              >
                {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
