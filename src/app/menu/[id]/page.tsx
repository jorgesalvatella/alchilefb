'use client';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Flame } from 'lucide-react';
import SpiceRecommender from '@/components/menu/spice-recommender';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { doc } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function MenuItemPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const firestore = useFirestore();
  const menuItemRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'menu_items', id) : null),
    [firestore, id]
  );
  const { data: item, isLoading } = useDoc<MenuItem>(menuItemRef);

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-black text-white pt-24">
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
            <Skeleton className="aspect-square rounded-2xl bg-white/10" />
            <div className="space-y-6">
              <Skeleton className="h-16 w-3/4 bg-white/10" />
              <Skeleton className="h-10 w-1/4 bg-white/10" />
              <Skeleton className="h-24 w-full bg-white/10" />
              <Skeleton className="h-12 w-1/2 bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    notFound();
  }

  const placeholderImage = PlaceHolderImages.find((img) => img.id === item.image);
  const imageUrl = item.imageUrl || placeholderImage?.imageUrl || 'https://placehold.co/600x400';
  const imageHint = item.imageUrl ? item.name : placeholderImage?.imageHint;

  return (
    <div className="relative min-h-screen bg-black text-white pt-32">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

      <div className="relative container mx-auto px-4 pb-12 md:pb-20">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
          <div className="relative aspect-square bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <Image
              src={imageUrl}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 hover:scale-110"
              data-ai-hint={imageHint}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-8">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-3">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    {item.name}
                </span>
            </h1>
            <div className="flex items-center gap-4 mb-4">
              <p className="text-4xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">${item.price.toFixed(2)}</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Flame key={i} size={24} className={cn(i < item.spiceRating ? 'fill-current text-red-500' : 'text-white/20', 'transition-colors')} />
                ))}
              </div>
            </div>
            <p className="text-lg text-white/70 mb-6">{item.longDescription}</p>

            <div className="mb-6">
              <h3 className="font-headline text-xl text-white mb-3">Ingredientes</h3>
              <div className="flex flex-wrap gap-2">
                {item.ingredients && item.ingredients.map((ingredient) => (
                  <Badge key={ingredient} className="bg-white/10 text-white/80 border-white/20">{ingredient}</Badge>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <h3 className="font-headline text-xl text-white">Cantidad</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-10 w-10 bg-white/5 border-white/20 text-white hover:bg-white/10">
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="font-bold text-2xl w-10 text-center">1</span>
                <Button variant="outline" size="icon" className="h-10 w-10 bg-white/5 border-white/20 text-white hover:bg-white/10">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <SpiceRecommender />

            <div className="mt-8">
              <Button size="lg" className="w-full md:w-auto font-headline text-lg py-7 px-10 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300">
                Añadir al Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}