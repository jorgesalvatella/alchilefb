'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// TODO: Reemplazar esto con un hook de estado global (Zustand, Context, etc.)
const mockCartItems = [
  {
    id: '1',
    name: 'Taco de Pastor',
    description: 'Carne de cerdo marinada, piña, cilantro y cebolla.',
    price: 25,
    imageUrl: PlaceHolderImages.getRandomImage('Taco de Pastor').imageUrl,
    quantity: 2,
  },
  {
    id: '2',
    name: 'Agua de Horchata',
    description: 'Bebida refrescante de arroz con canela.',
    price: 20,
    imageUrl: PlaceHolderImages.getRandomImage('Agua de Horchata').imageUrl,
    quantity: 1,
  },
];

export default function CartPage() {
  // TODO: Este estado debe venir de un hook global
  const [cartItems, setCartItems] = useState(mockCartItems);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  
  // TODO: Calcular impuestos y envío en una fase posterior
  const total = subtotal;

  if (cartItems.length === 0) {
    return (
        <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Tu Carrito está Vacío</h1>
            <p className="mt-2 text-lg text-gray-500">
                Parece que aún no has añadido nada. ¡Explora nuestro menú!
            </p>
            <Button asChild className="mt-6 bg-fresh-green text-black hover:bg-fresh-green/80">
                <Link href="/menu">Ir al Menú</Link>
            </Button>
        </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">Tu Carrito</h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          Revisa tu pedido y prepárate para disfrutar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de tu Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                    <div className="mt-2 flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        <MinusCircle className="h-5 w-5" data-testid="minus-circle-icon" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10) || 1)}
                        className="w-16 text-center"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        <PlusCircle className="h-5 w-5" data-testid="plus-circle-icon" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-2 text-gray-500 hover:text-red-500"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-5 w-5" data-testid="trash-2-icon" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Total del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Envío</span>
                <span>Calculado al pagar</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-fresh-green text-black hover:bg-fresh-green/80 text-lg py-6">
                Proceder al Pago
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
