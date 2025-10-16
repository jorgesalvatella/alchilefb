'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black text-white text-center p-8 pt-32">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-chile-red rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <Compass className="w-24 h-24 text-orange-400/50 mb-8 animate-spin" style={{ animationDuration: '10s' }} />

        <h1 className="text-9xl md:text-[12rem] font-black text-white leading-none">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            404
          </span>
        </h1>
        
        <h2 className="text-2xl md:text-4xl font-bold mt-4">Página no encontrada</h2>
        <p className="mt-4 text-lg text-white/70 max-w-md">
          Oops, parece que esta página se perdió en el ciberespacio. No te preocupes, te ayudamos a encontrar el camino de vuelta.
        </p>

        <Button asChild size="lg" className="mt-10 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold text-lg py-7 px-10 rounded-full hover:scale-105 transition-transform duration-300">
          <Link href="/">
            Volver al Inicio
          </Link>
        </Button>
      </div>
    </main>
  );
}
