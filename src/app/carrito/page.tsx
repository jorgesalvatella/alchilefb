'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useUser } from '@/firebase';
import StorageImage from '@/components/StorageImage';

export default function CartPage() {
  const { user, isUserLoading } = useUser();
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const [serverTotals, setServerTotals] = useState({ subtotal: 0, tax: 0, total: 0 });
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyTotals = async () => {
      if (isUserLoading) {
        return;
      }

      if (cartItems.length === 0) {
        setIsVerifying(false);
        setServerTotals({ subtotal: 0, tax: 0, total: 0 });
        return;
      }

      if (!user) {
        setIsVerifying(false);
        setServerTotals({ subtotal: 0, tax: 0, total: 0 });
        return;
      }

      setIsVerifying(true);
      try {
        const token = await user.getIdToken();
        const itemsToVerify = cartItems.map(item => ({
          id: item.id,
          quantity: item.quantity
        }));

        const response = await fetch('/api/cart/verify-totals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ items: itemsToVerify }),
        });

        if (!response.ok) {
          throw new Error('Failed to verify totals');
        }

        const data = await response.json();
        setServerTotals(data);
      } catch (error) {
        console.error("Error verifying totals:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyTotals();
  }, [cartItems, user, isUserLoading]);

  if (cartItems.length === 0) {
    return (
        <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center pt-32">
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
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">Tu Carrito</h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          Revisa tu pedido y prepárate para disfrutar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de tu Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-start space-x-3">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <StorageImage
                      filePath={item.imageUrl}
                      alt={item.name}
                      fill
                      className="rounded-md object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold break-words pr-2">{item.name}</h3>
                      <p className="font-semibold flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center">
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
                          className="w-12 text-center h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <PlusCircle className="h-5 w-5" data-testid="plus-circle-icon" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 hover:text-red-500"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-5 w-5" data-testid="trash-2-icon" />
                      </Button>
                    </div>
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
                <span>{isVerifying ? 'Calculando...' : `$${serverTotals.subtotal.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IVA (16%)</span>
                <span>{isVerifying ? 'Calculando...' : `$${serverTotals.tax.toFixed(2)}`}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{isVerifying ? 'Calculando...' : `$${serverTotals.total.toFixed(2)}`}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={isVerifying} className="w-full bg-fresh-green text-black hover:bg-fresh-green/80 text-lg py-6">
                {isVerifying ? 'Verificando...' : 'Proceder al Pago'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
