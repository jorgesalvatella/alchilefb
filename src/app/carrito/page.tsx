'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { useCart, CartItem } from '@/context/cart-context';
import { useUser } from '@/firebase';
import StorageImage from '@/components/StorageImage';

type ServerTotals = {
  subtotalGeneral: number;
  ivaDesglosado: number;
  totalFinal: number;
};

export default function CartPage() {
  const { user, isUserLoading } = useUser();
  const { cartItems, updateQuantity, removeFromCart } = useCart();
  const [serverTotals, setServerTotals] = useState<ServerTotals>({ subtotalGeneral: 0, ivaDesglosado: 0, totalFinal: 0 });
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyTotals = async () => {
      if (isUserLoading) return;

      if (cartItems.length === 0) {
        setIsVerifying(false);
        setServerTotals({ subtotalGeneral: 0, ivaDesglosado: 0, totalFinal: 0 });
        return;
      }
      
      // No user needed for verification, as prices are public
      // if (!user) {
      //   setIsVerifying(false);
      //   // Optionally calculate a client-side estimate or show a login prompt
      //   return;
      // }

      setIsVerifying(true);
      try {
        // No token needed if the endpoint is public for price verification
        // const token = await user.getIdToken();
        const itemsToVerify = cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          customizations: {
            added: item.customizations?.added?.map(extra => extra.nombre) || [],
            removed: item.customizations?.removed || [],
          },
        }));

        const response = await fetch('/api/cart/verify-totals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToVerify }),
        });

        if (!response.ok) {
          throw new Error('Failed to verify totals');
        }

        const data = await response.json();
        setServerTotals(data.summary);
      } catch (error) {
        console.error("Error verifying totals:", error);
        // Handle error case, e.g., show a toast notification
      } finally {
        setIsVerifying(false);
      }
    };

    verifyTotals();
  }, [cartItems, user, isUserLoading]);

  const getItemTotal = (item: CartItem): number => {
    let unitPrice = item.price;
    if (item.customizations?.added) {
      item.customizations.added.forEach(extra => {
        unitPrice += extra.precio;
      });
    }
    return unitPrice * item.quantity;
  };

  const getUnitPrice = (item: CartItem): number => {
    let unitPrice = item.price;
    if (item.customizations?.added) {
      item.customizations.added.forEach(extra => {
        unitPrice += extra.precio;
      });
    }
    return unitPrice;
  };

  if (cartItems.length === 0) {
    return (
        <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 text-center pt-32">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400" />
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Tu Carrito está Vacío</h1>
            <p className="mt-2 text-lg text-gray-500">
                Parece que aún no has añadido nada. ¡Explora nuestro menú!
            </p>
            <Button asChild className="mt-6 bg-orange-500 text-white hover:bg-orange-600">
                <Link href="/menu">Ir al Menú</Link>
            </Button>
        </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white">Tu Carrito</h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-white/70">
          Revisa tu pedido y prepárate para disfrutar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <Card className="bg-gray-900/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-orange-400">Resumen de tu Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cartItems.map((item) => (
                <div key={item.cartItemId} className="flex items-start space-x-4">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    <StorageImage
                      filePath={item.imageUrl}
                      alt={item.name}
                      fill
                      className="rounded-md object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold break-words">{item.name}</h3>

                    {/* Price Breakdown */}
                    <div className="text-sm space-y-1 mt-2">
                      <div className="flex justify-between text-white/60">
                        <span>Precio base:</span>
                        <span>${item.price.toFixed(2)}</span>
                      </div>
                      {item.customizations?.added && item.customizations.added.map(extra => (
                        <div key={extra.nombre} className="flex justify-between text-yellow-400">
                          <span>+ {extra.nombre}</span>
                          <span>${extra.precio.toFixed(2)}</span>
                        </div>
                      ))}
                      {item.customizations?.removed && item.customizations.removed.map(removed => (
                        <p key={removed} className="text-red-400 text-xs">Sin {removed}</p>
                      ))}
                      <div className="flex justify-between text-white/80 font-semibold pt-1 border-t border-gray-700/50">
                        <span>Precio unitario:</span>
                        <span>${getUnitPrice(item).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-orange-400 font-bold">
                        <span>Subtotal ({item.quantity}x):</span>
                        <span>${getItemTotal(item).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} aria-label="Disminuir cantidad">
                          <MinusCircle className="h-5 w-5" />
                        </Button>
                        <Input type="number" readOnly value={item.quantity} className="w-12 text-center h-8 bg-gray-800 border-gray-600"/>
                        <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} aria-label="Aumentar cantidad">
                          <PlusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-500" onClick={() => removeFromCart(item.cartItemId)} aria-label="Eliminar item">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-gray-900/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-orange-400">Total del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{isVerifying ? 'Calculando...' : `$${serverTotals.subtotalGeneral.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>IVA (16%)</span>
                <span>{isVerifying ? 'Calculando...' : `$${serverTotals.ivaDesglosado.toFixed(2)}`}</span>
              </div>
              <Separator className="bg-gray-700" />
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>{isVerifying ? 'Calculando...' : `$${serverTotals.totalFinal.toFixed(2)}`}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={isVerifying || serverTotals.totalFinal === 0} className="w-full bg-orange-500 text-white hover:bg-orange-600 text-lg py-6">
                {isVerifying ? 'Verificando...' : 'Proceder al Pago'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
