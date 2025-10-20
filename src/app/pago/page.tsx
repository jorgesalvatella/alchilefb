'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import GooglePlacesAutocompleteWithMap from '@/components/GooglePlacesAutocompleteWithMap';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

interface AddressComponents {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

function CheckoutPage({ user }: WithAuthProps) {
  const { cartItems, clearCart, itemCount } = useCart();
  const router = useRouter();
  const { toast } = useToast();

  // Estado para la UI
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta a la entrega' | 'Transferencia bancaria' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para ubicación de entrega
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<AddressComponents | null>(null);
  const [verifiedTotal, setVerifiedTotal] = useState<number | null>(null);
  const [isVerifyingTotal, setIsVerifyingTotal] = useState(false);

  // Verificar el total del carrito con el backend
  useEffect(() => {
    const verifyTotals = async () => {
      if (itemCount === 0) {
        setVerifiedTotal(0);
        return;
      }

      setIsVerifyingTotal(true);

      try {
        // Transformar cartItems al formato esperado por el backend
        const itemsToVerify = cartItems.map(item => {
          if (item.isPackage) {
            // Es un paquete
            return {
              packageId: item.id,
              quantity: item.quantity,
              packageCustomizations: item.customizations || {}
            };
          } else {
            // Es un producto normal
            return {
              productId: item.id,
              quantity: item.quantity,
              customizations: {
                added: item.customizations?.added || [],
                removed: item.customizations?.removed || [],
              },
            };
          }
        });

        const response = await fetch('/api/cart/verify-totals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToVerify }),
        });

        if (!response.ok) {
          throw new Error('No se pudieron verificar los totales con el servidor.');
        }

        const data = await response.json();
        setVerifiedTotal(data.summary.totalFinal);
      } catch (error: any) {
        console.error("Error verifying totals:", error);
        toast({
          title: 'Error al verificar totales',
          description: 'No se pudo conectar con el servidor. Por favor, intenta de nuevo.',
          variant: 'destructive',
        });
        // Fallback: calcular en cliente si falla la verificación
        const fallbackTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setVerifiedTotal(fallbackTotal);
      } finally {
        setIsVerifyingTotal(false);
      }
    };

    verifyTotals();
  }, [cartItems, itemCount, toast]);

  const handleAddressSelect = (address: AddressComponents) => {
    setDeliveryLocation(address);
    setError(null);
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      toast({ title: 'Falta información', description: 'Por favor, selecciona un método de pago.', variant: 'destructive' });
      return;
    }

    if (!deliveryLocation) {
      toast({ title: 'Falta información', description: 'Por favor, selecciona una ubicación de entrega.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    toast({ title: 'Procesando tu pedido...' });

    try {
      if (!user) {
        throw new Error('Debes estar autenticado para realizar un pedido.');
      }
      const idToken = await user.getIdToken();

      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items: cartItems,
          shippingAddress: deliveryLocation,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Hubo un problema al crear tu pedido.');
      }

      const newOrder = await response.json();

      toast({ title: '¡Pedido Confirmado!', description: `Tu pedido #${newOrder.id.slice(0, 6)} ha sido recibido.` });
      clearCart();
      router.push(`/mis-pedidos?order=${newOrder.id}`);

    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Error al procesar el pedido', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (itemCount === 0 && !isSubmitting) {
    return (
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white mb-6">Tu Carrito está Vacío</h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-white/70 mb-8">¡Añade algunos productos para continuar!</p>
        <Button onClick={() => router.push('/menu')} className="bg-orange-500 text-white hover:bg-orange-600 font-bold">
          Ir al Menú
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white">Finalizar Compra</h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent font-black">
          Completa tu pedido en unos simples pasos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Columna Izquierda y Central: Opciones */}
        <div className="lg:col-span-2">
          <Card className="bg-gray-900/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-orange-400">1. Ubicación de Entrega</CardTitle>
              <p className="text-white/70 text-sm mt-2">
                Busca tu dirección o marca tu ubicación en el mapa
              </p>
            </CardHeader>
            <CardContent>
              <GooglePlacesAutocompleteWithMap
                value={deliveryAddress}
                onChange={setDeliveryAddress}
                onAddressSelect={handleAddressSelect}
                placeholder="Busca tu dirección o marca en el mapa..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Resumen */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-gray-900/50 border-gray-700 text-white">
            <CardHeader><CardTitle className="text-orange-400">2. Método de Pago</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)} className="space-y-3">
                <div className="flex items-center space-x-2"><RadioGroupItem value="Efectivo" id="efectivo" /><Label htmlFor="efectivo" className="text-white">Efectivo</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Tarjeta a la entrega" id="tarjeta" /><Label htmlFor="tarjeta" className="text-white">Tarjeta a la entrega</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="Transferencia bancaria" id="transferencia" /><Label htmlFor="transferencia" className="text-white">Transferencia bancaria</Label></div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 text-white">
            <CardHeader><CardTitle className="text-orange-400">3. Resumen del Pedido</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {cartItems.map(item => (
                  <li key={item.cartItemId} className="flex justify-between text-sm">
                    <span className="text-white">{item.quantity} x {item.name}</span>
                    <span className="font-medium text-white/80">${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <hr className="my-4 border-gray-700" />
              <div className="flex justify-between font-bold text-xl">
                <span className="text-white">Total</span>
                <span className="text-orange-400">
                  {isVerifyingTotal ? (
                    <span className="animate-pulse">Calculando...</span>
                  ) : verifiedTotal !== null ? (
                    `$${verifiedTotal.toFixed(2)}`
                  ) : (
                    'Calculando...'
                  )}
                </span>
              </div>
              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !paymentMethod || !deliveryLocation || verifiedTotal === null || isVerifyingTotal}
                className="w-full mt-6 bg-orange-500 text-white hover:bg-orange-600 font-bold text-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                {isSubmitting ? 'Confirmando...' : isVerifyingTotal ? 'Verificando totales...' : 'Confirmar Pedido'}
              </Button>
              {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default withAuth(CheckoutPage, 'user');