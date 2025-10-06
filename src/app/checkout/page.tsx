'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  address: z.string().min(5, 'A valid address is required'),
  city: z.string().min(2, 'City is required'),
  zipCode: z.string().min(5, 'A valid ZIP code is required'),
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
    alert('Order placed successfully! (simulation)');
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-6xl text-primary">Checkout</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Confirm Your Order</CardTitle>
          <CardDescription>Enter your details below to complete your purchase.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <h3 className="font-headline text-xl mb-4">Delivery Information</h3>
                <div className="space-y-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Input placeholder="123 Spicy St" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input placeholder="Flavor Town" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="zipCode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl><Input placeholder="12345" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-headline text-xl mb-4">Payment Method</h3>
                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                        <FormItem>
                           <Label className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent/50 has-[[data-state=checked]]:border-primary">
                             <RadioGroupItem value="card" /> Credit Card
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
                        <FormLabel>Card Number</FormLabel>
                        <FormControl><Input placeholder="•••• •••• •••• ••••" {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                       <FormField control={form.control} name="cardExpiry" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry</FormLabel>
                          <FormControl><Input placeholder="MM/YY" {...field} /></FormControl>
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

              <Button type="submit" size="lg" className="w-full font-headline text-lg">Place Order - $25.37</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
