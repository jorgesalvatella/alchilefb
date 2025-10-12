'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import StorageImage from '@/components/StorageImage';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, subtotal, tax, total } = useCart();

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
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <StorageImage
                      filePath={item.imageUrl}
                      alt={item.name}
                      fill
                      className="rounded-md object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                    <div className="mt-2 flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <MinusCircle className="h-5 w-5" data-testid="minus-circle-icon" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                        className="w-16 text-center"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
                      onClick={() => removeFromCart(item.id)}
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
                <span>IVA (16%)</span>
                <span>${tax.toFixed(2)}</span>
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
