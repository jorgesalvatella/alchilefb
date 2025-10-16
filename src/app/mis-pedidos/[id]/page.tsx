'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle, CookingPot, Bike, Pizza } from 'lucide-react';
import type { Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

const allSteps = [
  { id: 1, name: 'Pedido Realizado', icon: CheckCircle, status: 'Pedido Realizado' },
  { id: 2, name: 'Preparando', icon: CookingPot, status: 'Preparando' },
  { id: 3, name: 'En Reparto', icon: Bike, status: 'En Reparto' },
  { id: 4, name: 'Entregado', icon: Pizza, status: 'Entregado' },
];

// Función para geocodificar una dirección a coordenadas
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results[0]) {
      return data.results[0].geometry.location;
    }
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Función de utilidad para convertir Timestamps de Firestore de forma segura
function safeTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'object' && '_seconds' in timestamp) {
    return new Date(timestamp._seconds * 1000);
  }
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Ignorar errores de conversión
  }
  return null;
}

function OrderTrackingPage({ user }: WithAuthProps) {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapImage = PlaceHolderImages.getById('map-placeholder');

  useEffect(() => {
    const fetchOrder = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch(`/api/me/orders/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.status === 404) {
            notFound();
            return;
          }
          if (!response.ok) {
            throw new Error('Failed to fetch order details');
          }

          const data = await response.json();
          setOrder(data);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOrder();
  }, [user, id]);

  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (!order?.shippingAddress) return;

    const address = order.shippingAddress;

    if (typeof address === 'string' && address.startsWith('https://maps.google.com')) {
      const coordsMatch = address.match(/q=([-\d.]+),([-\d.]+)/);
      if (coordsMatch) {
        setDeliveryCoords({ lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) });
      }
      return;
    }

    if (typeof address === 'object' && address.lat && address.lng) {
      setDeliveryCoords({ lat: address.lat, lng: address.lng });
      return;
    }

    if (typeof address === 'object' && address.street && !address.lat) {
      const fullAddress = `${address.street}, ${address.city}, ${address.state}, ${address.postalCode}, ${address.country || 'Chile'}`;
      setIsGeocoding(true);
      geocodeAddress(fullAddress).then(coords => {
        setDeliveryCoords(coords);
        setIsGeocoding(false);
      });
      return;
    }

    if (typeof address === 'string' && address !== 'whatsapp') {
      setIsGeocoding(true);
      geocodeAddress(address).then(coords => {
        setDeliveryCoords(coords);
        setIsGeocoding(false);
      });
    }
  }, [order?.shippingAddress]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        <div className="text-center mb-12">
            <Skeleton data-testid="loading-skeleton" className="h-16 w-3/4 mx-auto mb-4 bg-gray-700" />
            <Skeleton data-testid="loading-skeleton" className="h-6 w-1/2 mx-auto bg-gray-600" />
        </div>
        <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
                <Skeleton data-testid="loading-skeleton" className="h-64 w-full rounded-xl bg-gray-700" />
                <Skeleton data-testid="loading-skeleton" className="h-80 w-full rounded-xl bg-gray-700" />
            </div>
            <div className="lg:col-span-2">
                <Skeleton data-testid="loading-skeleton" className="h-96 w-full rounded-xl bg-gray-700" />
            </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
        <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32 text-center">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white mb-3">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Pedido no Encontrado
                </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-white/70">
                No pudimos encontrar el pedido con el ID #{id}.
            </p>
        </main>
    );
  }

  const currentStepIndex = order ? allSteps.findIndex(step => step.status === order.status) : -1;

  const getStepTime = (stepIndex: number) => {
    const createdAtDate = safeTimestampToDate(order.createdAt);
    if (!createdAtDate) return null;

    if (stepIndex < currentStepIndex) return 'Completado';
    if (stepIndex === currentStepIndex) return createdAtDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) || 'Ahora';
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Rastrea Tu Pedido
                </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
                ¡El pedido #{id} está en camino!
            </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-gray-900/50 border-gray-700 text-white">
                <CardHeader>
                    <CardTitle className="text-orange-400">Estado del Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                    {allSteps.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isDelivered = index === allSteps.length - 1 && isCompleted;
                        return (
                            <li key={step.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all duration-300",
                                    isDelivered ? 'bg-gradient-to-br from-fresh-green to-green-600 border-fresh-green text-white shadow-lg shadow-fresh-green/20' :
                                    isCompleted ? 'bg-gradient-to-br from-orange-500 to-red-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' :
                                    'bg-gray-800 border-gray-600 text-white/40'
                                )}>
                                <step.icon className="h-6 w-6" />
                                </div>
                                {index < allSteps.length - 1 && (
                                <div className={cn("w-0.5 flex-grow transition-colors duration-300",
                                    isDelivered ? 'bg-fresh-green' :
                                    isCompleted ? 'bg-orange-500' :
                                    'bg-gray-700'
                                )} />
                                )}
                            </div>
                            <div className="pt-2">
                                <h3 className={cn("font-semibold text-lg transition-colors duration-300", isCompleted ? 'text-white' : 'text-white/60')}>{step.name}</h3>
                                <p className="text-sm text-white/70">{getStepTime(index)}</p>
                            </div>
                            </li>
                        )
                    })}
                    </ul>
                </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-orange-400">Artículos del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item, index) => (
                    <div key={index} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-white">{item.quantity} x {item.name}</span>
                        <span className="text-white/90">${item.totalItem ? item.totalItem.toFixed(2) : '0.00'}</span>
                      </div>
                      {item.customizations && (
                        <div className="text-xs text-white/60 mt-1 pl-2">
                          {item.customizations.added && item.customizations.added.length > 0 && (
                            <p>+ {item.customizations.added.map(a => a.nombre).join(', ')}</p>
                          )}
                          {item.customizations.removed && item.customizations.removed.length > 0 && (
                            <p>- {item.customizations.removed.join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <hr className="my-4 border-gray-700" />
                <div className="space-y-2">
                  {order.subtotalVerified !== undefined && order.taxVerified !== undefined && (
                    <>
                      <div className="flex justify-between text-white/80">
                        <span>Subtotal</span>
                        <span>${order.subtotalVerified.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-white/80">
                        <span>IVA</span>
                        <span>${order.taxVerified.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-xl mt-2">
                    <span className="text-white">Total</span>
                    <span className="text-orange-400">${order.totalVerified.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-900/50 border-gray-700 text-white">
              <CardHeader>
                <CardTitle className="text-orange-400">Ubicación de Entrega</CardTitle>
              </CardHeader>
              <CardContent>
                {isGeocoding ? (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                    <p className="text-white/60">Cargando mapa...</p>
                  </div>
                ) : order.shippingAddress === 'whatsapp' ? (
                  <div className="text-center p-4">
                    <p className="text-white/80">Dirección coordinada por WhatsApp</p>
                    <p className="text-sm text-white/60 mt-2">El mapa se mostrará una vez confirmada la ubicación</p>
                  </div>
                ) : deliveryCoords ? (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-800">
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${deliveryCoords.lat},${deliveryCoords.lng}&zoom=15`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      className="absolute inset-0"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-800">
                    {mapImage && (
                      <Image
                        src={mapImage.imageUrl}
                        alt={mapImage.description}
                        fill
                        className="object-cover opacity-70"
                        data-ai-hint={mapImage.imageHint}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <p className="text-white/80 text-center px-4">No se pudo determinar la ubicación</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card adicional con información de dirección (solo si no es WhatsApp) */}
            {order.shippingAddress !== 'whatsapp' && typeof order.shippingAddress === 'object' && (
              <Card className="bg-gray-900/50 border-gray-700 text-white">
                <CardHeader>
                  <CardTitle className="text-orange-400">Detalles de Dirección</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-white/80 space-y-1">
                    {/* Nueva estructura con formattedAddress */}
                    {order.shippingAddress.formattedAddress ? (
                      <>
                        <p className="font-semibold text-white">{order.shippingAddress.formattedAddress}</p>
                        {order.shippingAddress.neighborhood && (
                          <p className="text-white/60">Barrio: {order.shippingAddress.neighborhood}</p>
                        )}
                        {order.shippingAddress.lat && order.shippingAddress.lng && (
                          <p className="text-white/50 text-xs mt-2">
                            📍 {order.shippingAddress.lat.toFixed(6)}, {order.shippingAddress.lng.toFixed(6)}
                          </p>
                        )}
                      </>
                    ) : (
                      /* Estructura legacy */
                      <>
                        <p className="font-semibold text-white">{order.shippingAddress.name}</p>
                        <p>{order.shippingAddress.street}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                        <p>{order.shippingAddress.postalCode}</p>
                        <p className="text-white/60 mt-2">{order.shippingAddress.phone}</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </main>
  );
}

export default withAuth(OrderTrackingPage, 'user');
