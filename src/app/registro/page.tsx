'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAuth, useFirestore } from '@/firebase/provider';
import { initiateEmailSignUp } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';

const signupSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo es requerido.'),
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      // Redirect to home page after successful signup
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const onSignupSubmit = (values: z.infer<typeof signupSchema>) => {
    const userProfileData = {
      email: values.email,
      firstName: values.fullName.split(' ')[0] || '',
      lastName: values.fullName.split(' ').slice(1).join(' ') || '',
      role: 'customer' as const,
    };

    initiateEmailSignUp(auth, firestore, values.email, values.password, userProfileData);

    toast({
      title: 'Cuenta creada',
      description: '¡Bienvenido a Al Chile! Tu cuenta ha sido creada exitosamente.',
    });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black p-4 pt-24">
      <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-white mb-3">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                Crea tu
              </span>
              <span className="block text-6xl mt-1 bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">
                Cuenta
              </span>
            </h1>
            <p className="text-white/60">Únete a la familia Al Chile.</p>
          </div>

          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-6">
              <FormField
                control={signupForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Nombre Completo" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="email" placeholder="Correo Electrónico" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="password" placeholder="Contraseña" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full font-headline text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300"
              >
                Crear Cuenta
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-white/50">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/ingresar" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
