'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Flame } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, limit, query } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');
  const firestore = useFirestore();

  const featuredItemsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'menu_items'), limit(3)) : null),
    [firestore]
  );
  const { data: featuredItems, isLoading } = useCollection<MenuItem>(featuredItemsQuery);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[80vh] w-full flex items-center justify-center text-center text-white">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="relative z-10 p-4 flex flex-col items-center">
          <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-tight drop-shadow-lg">
            Sabor con Arte.
          </h1>
          <h2 className="font-headline text-5xl md:text-7xl lg:text-8xl tracking-tight text-primary drop-shadow-lg mb-6">
            Auténticamente Mexicano.
          </h2>
          <p className="max-w-2xl text-lg md:text-xl text-foreground/90 mb-8">
            Experimenta los vibrantes sabores de México, elaborados con pasión y entregados con un toque picante. Bienvenido a Al Chile.
          </p>
          <Button asChild size="lg" className="font-headline text-lg">
            <Link href="/menu">
              Explora El Menú <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Featured Items Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-headline text-4xl md:text-5xl text-primary mb-2">Platillos Destacados</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">Favoritos seleccionados que capturan el alma de nuestra cocina.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden h-full">
                    <CardHeader className="p-0">
                        <Skeleton className="h-64 w-full" />
                    </CardHeader>
                    <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-4" />
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-6 w-1/4" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    </CardContent>
                </Card>
            ))}
            {featuredItems && featuredItems.map((item) => {
              const itemImage = PlaceHolderImages.find((img) => img.id === item.image);
              const imageUrl = item.imageUrl || itemImage?.imageUrl || 'https://placehold.co/600x400';
              const imageHint = item.imageUrl ? item.name : itemImage?.imageHint;
              return (
              <Link href={`/menu/${item.id}`} key={item.id} className="group">
                <Card className="overflow-hidden h-full transform transition-all duration-300 hover:scale-105 hover:shadow-primary/20 shadow-lg">
                  <CardHeader className="p-0">
                    <div className="relative h-64 w-full">
                        <Image
                          src={imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                           data-ai-hint={imageHint}
                        />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <CardTitle className="font-headline text-2xl mb-2">{item.name}</CardTitle>
                    <p className="text-muted-foreground mb-4 line-clamp-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                       <p className="text-xl font-bold text-primary">${item.price.toFixed(2)}</p>
                       <div className="flex items-center gap-1 text-sm text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Flame key={i} size={16} className={i < item.spiceRating ? 'fill-current' : 'text-muted-foreground/30'}/>
                          ))}
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )})}
          </div>
        </div>
      </section>
      
      {/* About Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="font-headline text-4xl md:text-5xl text-primary mb-4">¿Te Atreves o Prefieres?</h2>
                <p className="text-lg text-muted-foreground mb-4">"¿Te atreves o prefieres?" es nuestro lema. Celebramos todo el espectro del picante, desde el calor suave que reconforta hasta el toque ardiente que emociona. En Al Chile, cada platillo es una invitación a explorar tu propia frontera de sabor.</p>
                <p className="text-lg text-muted-foreground mb-8">Nuestro recomendador de picante con IA aprende de tu gusto para sugerir el nivel de picante perfecto para cada pedido. Encuentra tu fuego.</p>
                <Button asChild size="lg" variant="outline" className="font-headline text-lg border-2">
                    <Link href="/menu">
                        Encuentra Tu Sabor
                    </Link>
                </Button>
            </div>
            <div className="relative h-80 md:h-96 rounded-lg overflow-hidden shadow-2xl">
                 {PlaceHolderImages.find(img => img.id === 'chiles-art') && (
                     <Image
                        src={PlaceHolderImages.find(img => img.id === 'chiles-art')!.imageUrl}
                        alt={PlaceHolderImages.find(img => img.id === 'chiles-art')!.description}
                        fill
                        className="object-cover"
                        data-ai-hint={PlaceHolderImages.find(img => img.id === 'chiles-art')!.imageHint}
                     />
                 )}
            </div>
        </div>
      </section>
    </div>
  );
}
