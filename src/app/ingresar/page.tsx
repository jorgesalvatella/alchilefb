'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/firebase/provider';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { Separator } from '@/components/ui/separator';
import { getLoginAttempts, setLoginAttempt, isBlocked, getBlockedUntil, clearLoginAttempts } from '@/lib/cookie-utils';
import { formatDistanceToNowStrict } from 'date-fns';

const MAX_FAILED_ATTEMPTS = 5; // Re-declare for frontend display consistency

const loginSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

const SocialButton = ({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof Button>) => (
    <Button variant="outline" className="w-full gap-2 bg-white/5 border-white/20 hover:bg-white/10 hover:text-white text-white/80" {...props}>
        {children}
    </Button>
)

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const [isLoginBlocked, setIsLoginBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }

    const blocked = isBlocked();
    setIsLoginBlocked(blocked);
    if (blocked) {
      const blockedUntil = getBlockedUntil();
      if (blockedUntil) {
        setBlockMessage(`Demasiados intentos fallidos. Inténtalo de nuevo en ${formatDistanceToNowStrict(blockedUntil, { addSuffix: true })}.`);
      }
    }
  }, [user, isUserLoading, router]);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    if (isLoginBlocked) {
      toast({
        title: 'Acceso Bloqueado',
        description: blockMessage,
        variant: 'destructive',
      });
      return;
    }

    try {
      await initiateEmailSignIn(auth, values.email, values.password);
      clearLoginAttempts(); // Clear attempts on successful login
      toast({
        title: 'Iniciando sesión...',
        description: 'Serás redirigido en un momento si tus credenciales son correctas.',
      });
    } catch (error: any) {
      setLoginAttempt(true); // Increment failed attempts
      const currentAttempts = getLoginAttempts().attempts;
      const blocked = isBlocked();

      if (blocked) {
        const blockedUntil = getBlockedUntil();
        if (blockedUntil) {
          setBlockMessage(`Demasiados intentos fallidos. Inténtalo de nuevo en ${formatDistanceToNowStrict(blockedUntil, { addSuffix: true })}.`);
        }
        setIsLoginBlocked(true);
        toast({
          title: 'Acceso Bloqueado',
          description: blockMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error de inicio de sesión',
          description: `Credenciales incorrectas. Te quedan ${MAX_FAILED_ATTEMPTS - currentAttempts} intentos.`, // Use MAX_FAILED_ATTEMPTS from cookie-utils
          variant: 'destructive',
        });
      }
      console.error('Login error:', error);
    }
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
                Bienvenido
              </span>
              <span className="block text-6xl mt-1 bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">
                de Vuelta
              </span>
            </h1>
            <p className="text-white/60">Inicia sesión para continuar</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Correo Electrónico" 
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Contraseña" 
                        {...field} 
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:ring-orange-500 focus:border-orange-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-right -mt-4">
                <Link href="/forgot-password" className="text-sm text-white/50 hover:text-white transition-colors">
                    ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Button 
                type="submit" 
                className="w-full font-headline text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300"
                disabled={isLoginBlocked || form.formState.isSubmitting}
              >
                {isLoginBlocked ? 'Acceso Bloqueado' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>
          {isLoginBlocked && (
            <p className="text-red-500 text-center mt-4 text-sm">
              {blockMessage}
            </p>
          )}
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/20"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/50 px-2 text-white/50">O continúa con</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SocialButton disabled>
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Google
            </SocialButton>
             <SocialButton disabled>
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.84c0-2.5 1.49-3.9 3.78-3.9 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" /></svg>
                Facebook
            </SocialButton>
          </div>

          <div className="mt-8 text-center text-sm text-white/50">
            ¿No tienes una cuenta?{' '}
            <Link href="/registro" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Regístrate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}