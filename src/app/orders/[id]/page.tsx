'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle, CookingPot, Bike, Pizza } from 'lucide-react';
import { useDoc, useCollection } from '@/firebase/firestore/use-doc';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { doc, collection } from 'firebase/firestore';
import type { Order, OrderItem, MenuItem } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const allSteps = [
  { id: 1, name: 'Pedido Realizado', icon: CheckCircle, status: 'Pedido Realizado' },
  { id: 2, name: 'Preparando', icon: CookingPot, status: 'Preparando' },
  { id: 3, name: 'En Reparto', icon: Bike, status: 'En Reparto' },
  { id: 4, name: 'Entregado', icon: Pizza, status: 'Entregado' },
];

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const firestore = useFirestore();
  const mapImage = PlaceHolderImages.find((img) => img.id === 'map-placeholder');

  const orderRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'orders', id) : null),
    [firestore, id]
  );
  const { data: order, isLoading } = useDoc<Order>(orderRef);

  const orderItemsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `orders/${id}/order_items`) : null),
    [firestore, id]
  );
  const { data: orderItems, isLoading: isLoadingItems } = useCollection<OrderItem>(orderItemsCollection);

  if (isLoading || isLoadingItems) {
    return (
      <div className="relative min-h-screen bg-black text-white pt-32">
        <div className="container mx-auto px-4 pb-12 md:pb-20">
            <Skeleton className="h-16 w-3/4 mx-auto mb-12 bg-white/10" />
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-8">
                    <Skeleton className="h-64 w-full rounded-2xl bg-white/10" />
                    <Skeleton className="h-80 w-full rounded-2xl bg-white/10" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-96 w-full rounded-2xl bg-white/10" />
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
        <div className="relative min-h-screen bg-black text-white pt-32">
            <div className="relative container mx-auto px-4 py-12 text-center">
                <h1 className="text-5xl md:text-7xl font-black text-white mb-3">
                    <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                        Pedido no Encontrado
                    </span>
                </h1>
                <p className="text-lg text-white/60 mt-2">
                    No pudimos encontrar el pedido con el ID #{id}.
                </p>
            </div>
        </div>
    );
  }

  const currentStepIndex = allSteps.findIndex(step => step.status === order.orderStatus);

  const getStepTime = (stepIndex: number) => {
    if (!order.orderDate) return null;
    if (stepIndex < currentStepIndex) return 'Completado';
    if (stepIndex === currentStepIndex) return order.orderDate?.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) || 'Ahora';
    return null;
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
                    Rastrea Tu Pedido
                </span>
            </h1>
            <p className="text-lg text-white/60 mt-2">
                ¡El pedido #{id} está en camino!
            </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
                <h2 className="font-headline text-3xl text-white mb-6">Estado del Pedido</h2>
                <ul className="space-y-4">
                {allSteps.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    return (
                        <li key={step.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "flex items-center justify-center h-12 w-12 rounded-full border-2 transition-all duration-300",
                                isCompleted ? 'bg-gradient-to-br from-orange-500 to-red-600 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 border-white/20 text-white/40'
                            )}>
                            <step.icon className="h-6 w-6" />
                            </div>
                            {index < allSteps.length - 1 && (
                            <div className={cn("w-0.5 flex-grow transition-colors duration-300", isCompleted ? 'bg-orange-500' : 'bg-white/10')} />
                            )}
                        </div>
                        <div className="pt-2">
                            <h3 className={cn("font-headline text-lg transition-colors duration-300", isCompleted ? 'text-white' : 'text-white/40')}>{step.name}</h3>
                            <p className="text-sm text-white/50">{getStepTime(index)}</p>
                        </div>
                        </li>
                    )
                })}
                </ul>
            </div>

            <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
                <h2 className="font-headline text-3xl text-white mb-4">Artículos del Pedido</h2>
                <div className="space-y-4">
                    {orderItems?.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="font-semibold">{item.name} (x{item.quantity})</span>
                            <span className="text-white/80">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6">
                <h2 className="font-headline text-3xl text-white mb-4">Mapa en Vivo</h2>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/30">
                    {mapImage && (
                        <Image
                        src={mapImage.imageUrl}
                        alt={mapImage.description}
                        fill
                        className="object-cover opacity-70"
                        data-ai-hint={mapImage.imageHint}
                        />
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
