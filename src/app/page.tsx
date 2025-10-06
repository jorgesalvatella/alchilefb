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
      
      {/* Challenge Section */}
      <section id="challenge" className="pb-20 md:pb-32 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-black relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-chile-red/5 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fresh-green/5 rounded-full filter blur-3xl"></div>
        <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16 fade-in-up">
                <h2 className="text-5xl md:text-6xl font-black text-dark-charcoal dark:text-gray-100 mb-4">
                ¿Te Atreves o Prefieres?
                </h2>
                <div className="w-24 h-1.5 bg-gradient-to-r from-chile-red to-fresh-green mx-auto mb-6 rounded-full"></div>
                <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Elige tu nivel de picante y déjate seducir por el sabor auténtico
                </p>
            </div>
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 max-w-6xl mx-auto">
                <div className="group relative bg-black rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-chile-red/30 hover:scale-105 border-2 border-transparent hover:border-chile-red/50 fade-in-up" style={{animationDelay: '0.2s'}}>
                <Image src="https://imagenes.nobbora.com/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(1).png" alt="Spicy Meatballs" width={600} height={400} className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"/>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                    <h3 className="text-4xl font-black text-white">Picante Extremo</h3>
                    <div className="w-16 h-16 bg-chile-red/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-chile-red" fill="currentColor" viewBox="0 0 24 24"><path d="M12.82,2.29A2.4,2.4,0,0,0,11.18,2.29C10.59,2.88,10.59,3.84,11.18,4.43L12,5.25l.82-.82c.59-.59.59-1.55,0-2.14M12,7.25a2.24,2.24,0,0,1-2.24,2.24h-1.5A4.74,4.74,0,0,0,13,5V3.5A2.5,2.5,0,0,0,10.5,1,2.5,2.5,0,0,0,8,3.5V5a4.74,4.74,0,0,0,4.74,4.74h-1.5A2.24,2.24,0,0,1,9,7.25a2.24,2.24,0,0,1,2.24-2.24A2.24,2.24,0,0,1,13.5,7.25,2.24,2.24,0,0,1,12,9.49H12A2.24,2.24,0,0,1,9.75,7.25a2.24,2.24,0,0,1,2.25-2.24A2.24,2.24,0,0,1,14.25,7.25,2.24,2.24,0,0,1,12,9.49h0a2.24,2.24,0,0,1-2.24-2.24A2.24,2.24,0,0,1,12,5a2.24,2.24,0,0,1,2.24,2.25,2.24,2.24,0,0,1-2.24,2.24H12a2.24,2.24,0,0,1-2.24-2.24A2.24,2.24,0,0,1,12,5a2.24,2.24,0,0,1,2.24,2.25Z"/><path d="M18,11H6a3,3,0,0,0-3,3v6a3,3,0,0,0,3,3H18a3,3,0,0,0,3-3V14A3,3,0,0,0,18,11Zm-6,8a1,1,0,1,1,1-1A1,1,0,0,1,12,19Zm3-3H9a1,1,0,0,1,0-2h6a1,1,0,0,1,0,2Z"/></svg>
                    </div>
                    </div>
                    <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                    Para los valientes que buscan una explosión de sabor y picor. Preparado con chiles frescos y especias secretas.
                    </p>
                    <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-gray-300"><svg className="w-6 h-6 text-chile-red mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Chile habanero y serrano</li>
                    <li className="flex items-center text-gray-300"><svg className="w-6 h-6 text-chile-red mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Nivel de picor: <span className="font-bold ml-1">Alto 🔥🔥🔥</span></li>
                    <li className="flex items-center text-gray-300"><svg className="w-6 h-6 text-chile-red mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Salsa roja artesanal</li>
                    </ul>
                    <Button className="w-full bg-gradient-to-r from-chile-red to-red-700 text-white font-bold py-4 rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg h-auto">
                    ¡Me Atrevo!
                    </Button>
                </div>
                </div>
                <div className="group relative bg-black rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-fresh-green/30 hover:scale-105 border-2 border-transparent hover:border-fresh-green/50 fade-in-up" style={{animationDelay: '0.4s'}}>
                <Image src="https://imagenes.nobbora.com/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(2).png" alt="Mild Meatballs" width={600} height={400} className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"/>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                    <h3 className="text-4xl font-black text-white">Sabor Suave</h3>
                    <div className="w-16 h-16 bg-fresh-green/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-fresh-green" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8S16.41,20,12,20z M7,11.5C7,10.67,7.67,10,8.5,10S10,10.67,10,11.5S9.33,13,8.5,13S7,12.33,7,11.5z M14,11.5c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S16.33,13,15.5,13S14,12.33,14,11.5z M12,16c-2.33,0-4.31-1.46-5.11-3.5h10.22C16.31,14.54,14.33,16,12,16z"/></svg>
                    </div>
                    </div>
                    <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                    Para los que prefieren disfrutar de la ternura y el sazón sin picante. Sabor tradicional con hierbas frescas.
                    </p>
                    <ul className="space-y-4 mb-8">
                    <li className="flex items-center text-gray-300"><svg className="w-6 h-6 text-fresh-green mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Hierbas aromáticas frescas</li>
                    <li className="flex items-center text-gray-300"><svg className="w-6 h-6 text-fresh-green mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Nivel de picor: <span className="font-bold ml-1">Ninguno ✨</span></li>
                    <li className="flex items-center text-gray-300"><svg className="w-6 h-6 text-fresh-green mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Salsa verde tradicional</li>
                    </ul>
                    <Button className="w-full bg-gradient-to-r from-fresh-green to-yellow-600 text-white font-bold py-4 rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg h-auto">
                    ¡Lo Prefiero!
                    </Button>
                </div>
                </div>
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
