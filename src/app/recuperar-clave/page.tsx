'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/firebase/provider';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const forgotPasswordSchema = z.object({
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
});

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      await sendPasswordResetEmail(auth, values.email);
      setIsSent(true);
      toast({
        title: 'Correo enviado',
        description: 'Se han enviado las instrucciones para restablecer tu contraseña a tu correo electrónico.',
      });
    } catch (error) {
      toast({
        title: 'Error al enviar el correo',
        description: 'Hubo un problema al enviar el correo de restablecimiento. Por favor, verifica el correo e inténtalo de nuevo.',
        variant: 'destructive',
      });
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
                Restablecer
              </span>
              <span className="block text-6xl mt-1 bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">
                Contraseña
              </span>
            </h1>
            <p className="text-white/60">Ingresa tu correo para recibir instrucciones.</p>
          </div>

          {isSent ? (
            <div className="text-center text-white/80">
              <p>Se han enviado las instrucciones para restablecer tu contraseña a tu correo electrónico.</p>
              <Button asChild className="mt-6">
                <Link href="/ingresar">Volver a Iniciar Sesión</Link>
              </Button>
            </div>
          ) : (
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
                <Button 
                  type="submit" 
                  className="w-full font-headline text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300"
                >
                  Enviar Instrucciones
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-8 text-center text-sm text-white/50">
            ¿Recuerdas tu contraseña?{' '}
            <Link href="/ingresar" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
