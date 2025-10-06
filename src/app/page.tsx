'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Phone, Pizza, CreditCard } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, limit, query } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const sampleMenuItems: MenuItem[] = [
    {
      id: "1",
      name: "Tacos al Pastor",
      description: "Carne de cerdo marinada en achiote, asada lentamente y servida con piña.",
      longDescription: "Un clásico de la Ciudad de México. Nuestra carne de cerdo se marina durante 24 horas en una mezcla secreta de chiles y achiote, luego se asa en un trompo vertical y se sirve en tortillas de maíz calientes con un toque de piña, cilantro y cebolla.",
      price: 4.50,
      category: "Tacos",
      imageUrl: "https://imagenes.nobbora.com/taco-al-pastor.jpg",
      ingredients: ["Cerdo", "Achiote", "Piña", "Cilantro", "Cebolla"],
      spiceRating: 2,
    },
    {
      id: "2",
      name: "Burrito de Barbacoa",
      description: "Carne de res cocida a fuego lento, envuelta en una tortilla de harina gigante.",
      longDescription: "Nuestra barbacoa se cocina a fuego lento durante 8 horas hasta que está increíblemente tierna. La envolvemos en una tortilla de harina tostada con arroz, frijoles negros, queso y nuestra salsa de la casa.",
      price: 14.99,
      category: "Burritos",
      imageUrl: "https://imagenes.nobbora.com/burrito-barbacoa.jpg",
      ingredients: ["Res", "Arroz", "Frijoles Negros", "Queso", "Salsa"],
      spiceRating: 1,
    },
    {
        id: "3",
        name: "Esquites 'Al Chile'",
        description: "Granos de elote tierno con mayonesa, queso cotija, chile en polvo y lima.",
        longDescription: "El antojito callejero mexicano por excelencia. Servimos granos de elote calientes y tiernos en un vaso, cubiertos con una cremosa mayonesa, queso cotija salado, un toque de chile en polvo y un chorrito de jugo de lima fresca. ¡No podrás comer solo uno!",
        price: 6.00,
        category: "Acompañamientos",
        imageUrl: "https://imagenes.nobbora.com/esquites.jpg",
        ingredients: ["Elote", "Mayonesa", "Queso Cotija", "Chile en Polvo", "Lima"],
        spiceRating: 1,
    },
];

export default function Home() {
  const heroMeatballsImage = {
    imageUrl: "https://imagenes.nobbora.com/Gemini_Generated_Image_dnit2idnit2idnit%20(3).png",
    description: "Spicy and non-spicy meatballs",
    imageHint: "spicy meatballs"
  };

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

        <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
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
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-orange-500 transform scale-x-0 md:group-hover:scale-x-100 transition-transform origin-right duration-300"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xl opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">¡Vamos!</span>
              </Link>
          </div>

        </div>
      </section>

      {/* Featured Items Section */}
      <section id="featured-items" className="py-20 md:py-32 bg-gray-50 dark:bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-headline text-5xl md:text-6xl text-primary mb-4">Platillos Destacados</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Una probadita de nuestras creaciones más populares, hechas con amor y el toque justo de picante.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sampleMenuItems.map((item) => {
              const image = PlaceHolderImages.find((img) => img.id === item.image);
              const imageUrl = item.imageUrl || image?.imageUrl || 'https://placehold.co/600x400';
              const imageHint = item.imageUrl ? item.name : image?.imageHint;
              return (
                <Card key={item.id} className="overflow-hidden shadow-lg hover:shadow-primary/20 transition-shadow duration-300 group">
                  <CardHeader className="p-0">
                    <div className="relative h-64 w-full">
                       <Image
                        src={imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={imageHint}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="font-headline text-2xl text-primary">{item.name}</CardTitle>
                      <div className="flex items-center gap-0.5 text-amber-400 shrink-0 ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Flame key={i} size={18} className={i < item.spiceRating ? 'fill-current' : 'text-muted-foreground/30'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-4 line-clamp-2 h-10">{item.description}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-2xl font-bold">${item.price.toFixed(2)}</p>
                      <Button asChild>
                        <Link href={`/menu/${item.id}`}>Ver Platillo</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="cta" className="pb-20 bg-white dark:bg-black">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-dark-charcoal dark:text-gray-100">¿Listo para Probar?</h2>
          <p className="text-lg mt-4 text-gray-600 dark:text-gray-300">Una experiencia que te hará decir '¡Al Chile!'</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="https://wa.me/5211234567890?text=Hola,%20quiero%20hacer%20un%20pedido%20de%20Al%20Chile%20Meatballs" target="_blank" className="bg-fresh-green text-white font-bold py-3 px-8 rounded-full hover:bg-yellow-700 transition duration-300">
              Pedir por WhatsApp
            </Link>
            <Link href="https://www.instagram.com/alchilemeatballs" target="_blank" className="bg-chile-red text-white font-bold py-3 px-8 rounded-full hover:bg-red-700 transition duration-300">
              Ver en Instagram
            </Link>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="pb-20 md:pb-32 bg-gradient-to-b from-gray-50 to-white dark:from-black dark:to-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 left-20 w-2 h-2 bg-chile-red rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-40 w-3 h-3 bg-fresh-green rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-20 left-1/3 w-2 h-2 bg-orange-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-40 right-20 w-3 h-3 bg-chile-red rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 fade-in-up">
              <h2 className="text-5xl md:text-6xl font-black text-dark-charcoal dark:text-gray-100 mb-6">
                Así de <span className="bg-gradient-to-r from-chile-red to-orange-600 bg-clip-text text-transparent">Fácil</span>
              </h2>
              <div className="w-32 h-1.5 bg-gradient-to-r from-chile-red via-orange-500 to-yellow-500 mx-auto mb-6 rounded-full"></div>
            </div>

            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 transform -translate-y-1/2">
                <div className="w-full h-full bg-gradient-to-r from-chile-red via-fresh-green to-orange-500 opacity-30 rounded-full"></div>
              </div>

              <div className="relative flex flex-col md:flex-row justify-between items-start gap-12 md:gap-8">
                <div className="text-center flex-1 fade-in-up" style={{animationDelay: '0.1s'}}>
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border-4 border-chile-red/50">
                      <Phone className="w-12 h-12 text-chile-red" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-dark-charcoal dark:text-gray-100 mb-3">1. Haz tu Pedido</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-4">
                    Contáctanos por WhatsApp o llámanos. Dinos qué se te antoja y dónde te encuentras.
                  </p>
                </div>

                <div className="text-center flex-1 fade-in-up" style={{animationDelay: '0.3s'}}>
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border-4 border-fresh-green/50">
                      <Pizza className="w-12 h-12 text-fresh-green" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-dark-charcoal dark:text-light-gray mb-3">2. Preparamos tu Comida</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-4">
                    Cocinamos tus albóndigas al momento con los ingredientes más frescos y nuestra sazón especial.
                  </p>
                </div>

                <div className="text-center flex-1 fade-in-up" style={{animationDelay: '0.5s'}}>
                  <div className="relative inline-block mb-6">
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center border-4 border-orange-500/50">
                      <CreditCard className="w-12 h-12 text-orange-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-dark-charcoal dark:text-light-gray mb-3">3. Paga y Disfruta</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-4">
                    Recibe tu pedido en casa. Paga con transferencia, efectivo o tarjeta al recibir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
