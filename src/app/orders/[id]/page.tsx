import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle, CookingPot, Bike, Pizza } from 'lucide-react';

const orderStatusSteps = [
  { id: 1, name: 'Pedido Realizado', icon: CheckCircle, completed: true, time: '12:30 PM' },
  { id: 2, name: 'Preparando', icon: CookingPot, completed: true, time: '12:35 PM' },
  { id: 3, name: 'En Reparto', icon: Bike, completed: false, time: '12:50 PM (est.)' },
  { id: 4, name: 'Entregado', icon: Pizza, completed: false, time: null },
];

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const mapImage = PlaceHolderImages.find((img) => img.id === 'map-placeholder');

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
              {orderStatusSteps.map((step, index) => (
                <li key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 ${step.completed ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border'}`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    {index < orderStatusSteps.length - 1 && (
                      <div className={`w-0.5 flex-grow ${orderStatusSteps[index+1].completed ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-headline text-lg ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.name}</h3>
                    {step.time && <p className="text-sm text-muted-foreground">{step.time}</p>}
                  </div>
                </li>
              ))}
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
