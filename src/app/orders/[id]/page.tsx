'use client';

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle, CookingPot, Bike, Pizza } from 'lucide-react';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import type { Order } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

const allSteps = [
  { id: 1, name: 'Pedido Realizado', icon: CheckCircle, status: 'Pedido Realizado' },
  { id: 2, name: 'Preparando', icon: CookingPot, status: 'Preparando' },
  { id: 3, name: 'En Reparto', icon: Bike, status: 'En Reparto' },
  { id: 4, name: 'Entregado', icon: Pizza, status: 'Entregado' },
];

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const mapImage = PlaceHolderImages.find((img) => img.id === 'map-placeholder');

  const orderRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'orders', params.id) : null),
    [firestore, params.id]
  );
  const { data: order, isLoading } = useDoc<Order>(orderRef);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-12" />
        <div className="grid lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1">
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-4">
                    {Array.from({length: 4}).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="aspect-video w-full rounded-lg" /></CardContent>
                </Card>
            </div>
        </div>
      </div>
    );
  }

  if (!order) {
    // We can't call notFound() directly if there's a chance the doc is just loading.
    // It's better to show a "not found" state in the UI.
    return (
        <div className="container mx-auto px-4 py-12 text-center">
            <h1 className="font-headline text-5xl md:text-6xl text-primary">Pedido no Encontrado</h1>
            <p className="text-lg text-muted-foreground mt-2">
                No pudimos encontrar el pedido con el ID #{params.id}.
            </p>
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
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-6xl text-primary">Rastrea Tu Pedido</h1>
        <p className="text-lg text-muted-foreground mt-2">
          ¡El pedido #{params.id} está en camino!
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {allSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isNext = index === currentStepIndex + 1;

                  return (
                    <li key={step.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border'}`}>
                          <step.icon className="h-5 w-5" />
                        </div>
                        {index < allSteps.length - 1 && (
                          <div className={`w-0.5 flex-grow ${isNext || isCompleted ? 'bg-primary' : 'bg-border'}`} />
                        )}
                      </div>
                      <div>
                        <h3 className={`font-headline text-lg ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>{step.name}</h3>
                        <p className="text-sm text-muted-foreground">{getStepTime(index)}</p>
                      </div>
                    </li>
                  )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Mapa en Vivo</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                    {mapImage && (
                        <Image
                        src={mapImage.imageUrl}
                        alt={mapImage.description}
                        fill
                        className="object-cover"
                        data-ai-hint={mapImage.imageHint}
                        />
                    )}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}