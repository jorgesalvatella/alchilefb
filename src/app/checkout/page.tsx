'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, addDoc } from 'firebase/firestore';
import { CreditCard, Landmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const addressSchema = z.object({
  street: z.string().min(1, 'La calle es requerida.'),
  interior: z.string().optional(),
  neighborhood: z.string().min(1, 'La colonia es requerida.'),
  city: z.string().min(1, 'La ciudad es requerida.'),
  state: z.string().min(1, 'El estado es requerido.'),
  postalCode: z.string().min(5, 'El código postal debe tener 5 dígitos.'),
  country: z.string().min(1, 'El país es requerido.'),
  phone: z.string().min(10, 'El teléfono debe tener 10 dígitos.'),
});

const checkoutSchema = z.object({
  deliveryAddress: z.string().min(1, 'Por favor, selecciona o añade una dirección de entrega.'),
  paymentMethod: z.enum(['card', 'cash', 'transfer'], { required_error: 'Por favor, selecciona un método de pago.' }),
});

const cartItems = [
  { id: 1, name: 'Tacos al Pastor', price: 3.50, quantity: 2, imageId: 'taco-al-pastor' },
  { id: 2, name: 'Burrito de Carne Asada', price: 12.99, quantity: 1, imageId: 'burrito-asada' },
  { id: 3, name: 'Horchata Clásica', price: 4.00, quantity: 2, imageId: 'horchata' },
];

const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
const tax = subtotal * 0.08;
const total = subtotal + tax;

export default function CheckoutPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  const addressesCollection = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/delivery_addresses`) : null),
    [firestore, user]
  );
  const { data: addresses, isLoading: isLoadingAddresses } = useCollection(addressesCollection);

  const checkoutForm = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
  });

  const addressForm = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      street: '',
      interior: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'México',
      phone: '',
    },
  });

  const onAddNewAddress = async (values: z.infer<typeof addressSchema>) => {
    if (!user) return;
    try {
      const newAddressRef = await addDoc(collection(firestore, `users/${user.uid}/delivery_addresses`), values);
      checkoutForm.setValue('deliveryAddress', newAddressRef.id);
      setShowNewAddressForm(false);
      addressForm.reset();
    } catch (error) {
      console.error("Error adding new address: ", error);
    }
  };

  function onCheckoutSubmit(values: z.infer<typeof checkoutSchema>) {
    console.log("Order submitted:", values);
    alert('¡Pedido realizado con éxito! (simulación)');
  }

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
              Finalizar Compra
            </span>
          </h1>
        </div>

        <Form {...checkoutForm}>
          <form onSubmit={checkoutForm.handleSubmit(onCheckoutSubmit)} className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-2 space-y-8">
              {/* Delivery Address Section */}
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
                <h2 className="font-headline text-3xl text-white mb-4">¿A dónde enviamos tu pedido?</h2>
                {isLoadingAddresses ? (
                  <p>Cargando direcciones...</p>
                ) : addresses && addresses.length > 0 ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-orange-400 mb-2">Dirección Principal</h3>
                      <div className="rounded-lg border border-orange-500 bg-white/5 p-4">
                        <p className="font-semibold">{addresses[0].street}, {addresses[0].interior}</p>
                        <p className="text-white/70">{addresses[0].neighborhood}, {addresses[0].city}, {addresses[0].state} {addresses[0].postalCode}</p>
                        <p className="text-white/70">{addresses[0].phone}</p>
                      </div>
                      <Button onClick={() => checkoutForm.setValue('deliveryAddress', addresses[0].id)} className="mt-4 w-full md:w-auto bg-gradient-to-r from-orange-400 to-red-500">Enviar a esta dirección</Button>
                    </div>
                    
                    <Button variant="link" onClick={() => setShowNewAddressForm(!showNewAddressForm)} className="text-orange-400 hover:text-orange-300">
                      {showNewAddressForm ? 'Cancelar' : 'Enviar a otra dirección'}
                    </Button>

                    {showNewAddressForm && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Otras Direcciones</h3>
                        <FormField
                          control={checkoutForm.control}
                          name="deliveryAddress"
                          render={({ field }) => (
                            <FormItem>
                              <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-4">
                                {addresses.slice(1).map((address: any) => (
                                  <FormItem key={address.id}>
                                    <Label className={cn("flex items-start gap-4 rounded-lg border border-white/20 p-4 cursor-pointer transition-all hover:bg-white/5", field.value === address.id && "bg-white/10 border-orange-500")}>
                                      <RadioGroupItem value={address.id} className="mt-1" />
                                      <div className="text-sm">
                                        <p className="font-semibold">{address.street}, {address.interior}</p>
                                        <p className="text-white/70">{address.neighborhood}, {address.city}, {address.state} {address.postalCode}</p>
                                        <p className="text-white/70">{address.phone}</p>
                                      </div>
                                    </Label>
                                  </FormItem>
                                ))}
                              </RadioGroup>
                              <FormMessage className="mt-2" />
                            </FormItem>
                          )}
                        />
                        <h3 className="text-lg font-semibold text-white mt-6 mb-2">Añadir Nueva Dirección</h3>
                        <Form {...addressForm}>
                          <div className="space-y-4">
                            <Input {...addressForm.register('street')} placeholder="Calle y Número" className="bg-white/5 border-white/20" />
                            <Input {...addressForm.register('interior')} placeholder="Interior / Apartamento (Opcional)" className="bg-white/5 border-white/20" />
                            <Input {...addressForm.register('neighborhood')} placeholder="Colonia" className="bg-white/5 border-white/20" />
                            <div className="grid grid-cols-2 gap-4">
                              <Input {...addressForm.register('city')} placeholder="Ciudad" className="bg-white/5 border-white/20" />
                              <Input {...addressForm.register('state')} placeholder="Estado" className="bg-white/5 border-white/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <Input {...addressForm.register('postalCode')} placeholder="Código Postal" className="bg-white/5 border-white/20" />
                              <Input {...addressForm.register('country')} placeholder="País" className="bg-white/5 border-white/20" />
                            </div>
                            <Input {...addressForm.register('phone')} placeholder="Teléfono" className="bg-white/5 border-white/20" />
                            <Button onClick={addressForm.handleSubmit(onAddNewAddress)} className="w-full bg-orange-500 hover:bg-orange-600">Guardar y Usar esta Dirección</Button>
                          </div>
                        </Form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-white/70 mb-4">No tienes direcciones guardadas. Por favor, añade una.</p>
                    <Form {...addressForm}>
                      <div className="space-y-4">
                         <Input {...addressForm.register('street')} placeholder="Calle y Número" className="bg-white/5 border-white/20" />
                         <Input {...addressForm.register('interior')} placeholder="Interior / Apartamento (Opcional)" className="bg-white/5 border-white/20" />
                         <Input {...addressForm.register('neighborhood')} placeholder="Colonia" className="bg-white/5 border-white/20" />
                         <div className="grid grid-cols-2 gap-4">
                           <Input {...addressForm.register('city')} placeholder="Ciudad" className="bg-white/5 border-white/20" />
                           <Input {...addressForm.register('state')} placeholder="Estado" className="bg-white/5 border-white/20" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <Input {...addressForm.register('postalCode')} placeholder="Código Postal" className="bg-white/5 border-white/20" />
                           <Input {...addressForm.register('country')} placeholder="País" className="bg-white/5 border-white/20" />
                         </div>
                         <Input {...addressForm.register('phone')} placeholder="Teléfono" className="bg-white/5 border-white/20" />
                         <Button onClick={addressForm.handleSubmit(onAddNewAddress)} className="w-full bg-orange-500 hover:bg-orange-600">Guardar Dirección</Button>
                      </div>
                    </Form>
                  </div>
                )}
              </div>

              {/* Payment Method Section */}
              <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
                <h2 className="font-headline text-3xl text-white mb-4">Método de Pago</h2>
                <FormField
                  control={checkoutForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid md:grid-cols-3 gap-4">
                        <FormItem>
                          <Label className={cn("relative flex flex-col items-center justify-center gap-2 rounded-lg border border-white/20 p-4 cursor-pointer transition-all h-32 group", field.value === 'card' && "border-orange-500")}>
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                              <RadioGroupItem value="card" className="sr-only" />
                              <CreditCard className="h-8 w-8" />
                              <span className="font-semibold">Tarjeta</span>
                            </div>
                          </Label>
                        </FormItem>
                        <FormItem>
                          <Label className={cn("relative flex flex-col items-center justify-center gap-2 rounded-lg border border-white/20 p-4 cursor-pointer transition-all h-32 group", field.value === 'cash' && "border-orange-500")}>
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                              <RadioGroupItem value="cash" className="sr-only" />
                              <Wallet className="h-8 w-8" />
                              <span className="font-semibold">Efectivo</span>
                            </div>
                          </Label>
                        </FormItem>
                        <FormItem>
                          <Label className={cn("relative flex flex-col items-center justify-center gap-2 rounded-lg border border-white/20 p-4 cursor-pointer transition-all h-32 group", field.value === 'transfer' && "border-orange-500")}>
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                            <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                              <RadioGroupItem value="transfer" className="sr-only" />
                              <Landmark className="h-8 w-8" />
                              <span className="font-semibold">Transferencia</span>
                            </div>
                          </Label>
                        </FormItem>
                      </RadioGroup>
                      <FormMessage className="mt-2" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="sticky top-32 bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
              <h2 className="font-headline text-3xl text-white mb-4">Resumen del Pedido</h2>
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="font-semibold">{item.name} (x{item.quantity})</span>
                    <span className="text-white/80">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <Separator className="bg-white/20" />
                <div className="flex justify-between text-white/80">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/80">
                  <span>Impuestos y Tarifas</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator className="bg-white/20" />
                <div className="flex justify-between font-bold text-xl text-white">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full font-headline text-lg mt-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300">
                Realizar Pedido
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}