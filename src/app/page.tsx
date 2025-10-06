'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, limit, query } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function Home() {
  const heroMeatballsImage = {
    imageUrl: "https://imagenes.nobbora.com/Gemini_Generated_Image_dnit2idnit2idnit%20(3).png",
    description: "Spicy and non-spicy meatballs",
    imageHint: "spicy meatballs"
  };

  const firestore = useFirestore();

  const featuredItemsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'menu_items'), limit(3)) : null),
    [firestore]
  );
  const { data: featuredItems, isLoading } = useCollection<MenuItem>(featuredItemsQuery);
  
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* New Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-black"></div>

        <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="fade-in-up">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl">
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                Al Chile
              </span>
              <span className="block text-7xl md:text-9xl mt-2 bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">
                Meatballs
              </span>
            </h1>
            <p className="text-2xl md:text-3xl font-bold mb-4 text-white drop-shadow-xl">
              Mexican creations, <br />picantes y no picantes
            </p>
            <p className="text-xl md:text-xl text-white/80 mb-12 max-w-2xl mx-auto font-caveat">
              Experimenta el sabor auténtico de México con nuestra propuesta contemporánea
            </p>
          </div>

          <div className="mt-12 mb-12 relative float-animation" style={{ animationDelay: '0.3s' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 rounded-3xl blur-2xl opacity-40"></div>
            <Image
              src={heroMeatballsImage.imageUrl}
              alt={heroMeatballsImage.description}
              width={800}
              height={600}
              className="relative mx-auto rounded-3xl w-full md:w-2/3 lg:w-1/2 scale-hover"
              data-ai-hint={heroMeatballsImage.imageHint}
            />
          </div>
          
           <div className="flex flex-col sm:flex-row gap-6 justify-center items-center fade-in-up" style={{ animationDelay: '0.5s' }}>
              <Link href="/menu" className={cn("group relative px-10 py-5 font-black text-xl rounded-full md:hover:scale-110 transition-all duration-300 shadow-2xl overflow-hidden", scrolled ? 'bg-black' : 'bg-white')}>
                  <span className={cn("relative z-10 opacity-100 md:opacity-0 md:group-hover:opacity-0 transition-opacity duration-300", scrolled ? 'text-white' : 'text-primary')}>¡Pide Ahora!</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 transform scale-x-0 md:group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xl opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">¡Vamos!</span>
              </Link>
          </div>

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
