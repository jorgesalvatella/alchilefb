'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'El nombre completo es requerido'),
  address: z.string().min(5, 'Se requiere una dirección válida'),
  city: z.string().min(2, 'La ciudad es requerida'),
  zipCode: z.string().min(5, 'Se requiere un código postal válido'),
  paymentMethod: z.enum(['card', 'paypal']),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
});

export default function CheckoutPage() {
  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      address: '',
      city: '',
      zipCode: '',
      paymentMethod: 'card',
    },
  });

  function onSubmit(values: z.infer<typeof checkoutSchema>) {
    console.log(values);
    // In a real app, this would trigger the payment process.
    alert('¡Pedido realizado con éxito! (simulación)');
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-6xl text-primary">Pagar</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Confirma Tu Pedido</CardTitle>
          <CardDescription>Ingresa tus datos a continuación para completar tu compra.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <h3 className="font-headline text-xl mb-4">Información de Entrega</h3>
                <div className="space-y-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl><Input placeholder="Juan Pérez" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl><Input placeholder="Calle del Sabor 123" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl><Input placeholder="Ciudad Picante" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="zipCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl><Input placeholder="12345" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-headline text-xl mb-4">Método de Pago</h3>
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                        <FormItem>
                           <Label className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                             <RadioGroupItem value="card" /> Tarjeta de Crédito
                           </Label>
                        </FormItem>
                        <FormItem>
                           <Label className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                             <RadioGroupItem value="paypal" /> PayPal
                           </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )} />

                {form.watch('paymentMethod') === 'card' && (
                  <div className="space-y-4 mt-4">
                     <FormField control={form.control} name="cardNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Tarjeta</FormLabel>
                        <FormControl><Input placeholder="•••• •••• •••• ••••" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                       <FormField control={form.control} name="cardExpiry" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vencimiento</FormLabel>
                          <FormControl><Input placeholder="MM/AA" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="cardCvc" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVC</FormLabel>
                          <FormControl><Input placeholder="123" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full font-headline text-lg">Realizar Pedido - $25.37</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
