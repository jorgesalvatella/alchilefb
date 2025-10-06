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
       <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/2" />
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
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
        <div className="relative aspect-square rounded-lg overflow-hidden shadow-2xl">
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            data-ai-hint={imageHint}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-primary mb-2">{item.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-3xl font-bold text-foreground">${item.price.toFixed(2)}</p>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Flame key={i} size={20} className={i < item.spiceRating ? 'fill-current' : 'text-muted-foreground/30'} />
              ))}
            </div>
          </div>
          <p className="text-lg text-muted-foreground mb-6">{item.longDescription}</p>

          <div className="mb-6">
            <h3 className="font-headline text-lg mb-2">Ingredientes</h3>
            <div className="flex flex-wrap gap-2">
              {item.ingredients && item.ingredients.map((ingredient) => (
                <Badge key={ingredient} variant="secondary">{ingredient}</Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-8">
            <h3 className="font-headline text-lg">Cantidad</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold text-lg w-8 text-center">1</span>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SpiceRecommender />

          <div className="mt-8">
            <Button size="lg" className="w-full md:w-auto font-headline text-lg">Añadir al Carrito</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
