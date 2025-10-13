'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider'; // Hook para obtener la app de Firebase
import type { Address, Order } from '@/lib/types';

// Mock de datos de usuario, a reemplazar con una llamada a la API
const mockUserAddresses: Address[] = [
  {
    name: 'Casa',
    street: 'Av. Siempre Viva 742',
    city: 'Springfield',
    state: 'Estado Desconocido',
    postalCode: '12345',
    country: 'EE. UU.',
    phone: '555-123-4567'
  }
];

export default function CheckoutPage() {
  const { cartItems, clearCart, itemCount } = useCart();
  const { app } = useFirebase(); // Obtener la app de Firebase inicializada
  const auth = getAuth(app);
  const router = useRouter();
  
  // Estado para la UI
  const [addressOption, setAddressOption] = useState('main');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta a la entrega' | 'Transferencia bancaria' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para los datos
  const [userAddresses, setUserAddresses] = useState<Address[]>(mockUserAddresses);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [verifiedTotal, setVerifiedTotal] = useState<number | null>(null);

  // Efecto para verificar el total del carrito con el backend
  useEffect(() => {
    const verifyTotals = async () => {
      if (itemCount > 0) {
        // En una implementación real, llamaríamos a /api/cart/verify-totals
        // Por ahora, calculamos en cliente como placeholder
        const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setVerifiedTotal(total);
      }
    };
    verifyTotals();
  }, [cartItems, itemCount]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no es soportada por tu navegador.');
      toast({ title: 'Error de Geolocalización', description: 'Tu navegador no soporta esta función.', variant: 'destructive' });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        toast({ title: 'Ubicación Obtenida', description: 'Tu ubicación se ha guardado correctamente.' });
      },
      () => {
        setError('No se pudo obtener la ubicación. Asegúrate de haber dado los permisos necesarios.');
        toast({ title: 'Error de Permiso', description: 'No se pudo obtener la ubicación. Revisa los permisos de tu navegador.', variant: 'destructive' });
      }
    );
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      toast({ title: 'Falta información', description: 'Por favor, selecciona un método de pago.', variant: 'destructive' });
      return;
    }

    let shippingAddressPayload: Order['shippingAddress'];

    switch (addressOption) {
      case 'main':
        if (userAddresses.length === 0) {
          toast({ title: 'Falta información', description: 'No tienes una dirección principal guardada.', variant: 'destructive' });
          return;
        }
        shippingAddressPayload = userAddresses[0];
        break;
      case 'whatsapp':
        shippingAddressPayload = 'whatsapp';
        break;
      case 'location':
        if (!currentLocation) {
          toast({ title: 'Falta información', description: 'Por favor, obtén tu ubicación actual primero.', variant: 'destructive' });
          return;
        }
        shippingAddressPayload = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lon}`;
        break;
      default:
        toast({ title: 'Error', description: 'Opción de dirección no válida.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    setError(null);
    toast({ title: 'Procesando tu pedido...' });

    try {
      const user = auth.currentUser;
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
          shippingAddress: shippingAddressPayload,
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
      router.push(`/mis-pedidos?order=${newOrder.id}`); // Redirigir a la lista de pedidos, resaltando el nuevo

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
          <Card className="mb-8 bg-gray-900/50 border-gray-700 text-white">
            <CardHeader><CardTitle className="text-orange-400">1. Dirección de Entrega</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={addressOption} onValueChange={setAddressOption} className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="main" id="main" />
                    <Label htmlFor="main" className="text-white">Usar mi dirección principal</Label>
                  </div>
                  {addressOption === 'main' && (
                    <div className="pl-6 mt-2 text-sm text-white/70 border-l-2 border-orange-500 ml-2">
                      <p>{userAddresses[0]?.street}</p>
                      <p>{`${userAddresses[0]?.city}, ${userAddresses[0]?.state} ${userAddresses[0]?.postalCode}`}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="whatsapp" />
                    <Label htmlFor="whatsapp" className="text-white">Coordinar por WhatsApp</Label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="location" id="location" />
                    <Label htmlFor="location" className="text-white">Enviar mi ubicación actual</Label>
                  </div>
                  {addressOption === 'location' && (
                    <div className="pl-6 mt-2 ml-2">
                      <Button variant="outline" onClick={handleGetLocation} className="border-gray-600 text-white hover:bg-fresh-green hover:text-black hover:border-fresh-green">Obtener Ubicación</Button>
                      {currentLocation && <p className="text-sm text-fresh-green mt-2">Ubicación guardada: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}</p>}
                    </div>
                  )}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

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
        </div>

        {/* Columna Derecha: Resumen */}
        <div className="lg:col-span-1">
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
                  {verifiedTotal !== null ? `$${verifiedTotal.toFixed(2)}` : 'Calculando...'}
                </span>
              </div>
              <Button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || !paymentMethod || !addressOption || verifiedTotal === null}
                className="w-full mt-6 bg-orange-500 text-white hover:bg-orange-600 font-bold text-lg py-6"
                size="lg"
              >
                {isSubmitting ? 'Confirmando...' : 'Confirmar Pedido'}
              </Button>
              {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
