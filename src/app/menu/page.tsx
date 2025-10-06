'use client';
import Link from 'next/link';
import Image from 'next/image';
import { menuCategories } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Flame, PlusCircle } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';
import { cn } from '@/lib/utils';

function MenuItemCard({ item }: { item: MenuItem }) {
  const image = PlaceHolderImages.find((img) => img.id === item.image);
  const imageUrl = item.imageUrl || image?.imageUrl || 'https://placehold.co/600x400';
  const imageHint = item.imageUrl ? item.name : image?.imageHint;

  return (
    <div className="group relative bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-primary/20 hover:scale-[1.02]">
      <div className="relative h-56 w-full overflow-hidden">
        <Link href={`/menu/${item.id}`}>
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            data-ai-hint={imageHint}
          />
        </Link>
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="font-headline text-xl text-white leading-tight">
              <Link href={`/menu/${item.id}`}>{item.name}</Link>
            </h3>
            <div className="flex items-center gap-0.5 text-sm text-amber-400 shrink-0 ml-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Flame key={i} size={16} className={cn(i < item.spiceRating ? 'fill-current text-red-500' : 'text-white/20', 'transition-colors')} />
              ))}
            </div>
          </div>
          <p className="text-white/60 text-sm mt-1 mb-4 line-clamp-2">{item.description}</p>
        </div>
        <div className="flex justify-between items-end mt-2">
          <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">${item.price.toFixed(2)}</p>
          <Button size="sm" className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white hover:scale-105 transition-transform duration-300">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPage() {
  const firestore = useFirestore();
  const menuItemsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'menu_items') : null),
    [firestore]
  );
  const { data: menuItems, isLoading } = useCollection<MenuItem>(menuItemsCollection);

  return (
    <div className="relative min-h-screen bg-black text-white pt-24">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative container mx-auto px-4 py-12">
        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-white mb-3">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Nuestro Menú
                </span>
            </h1>
            <p className="text-lg text-white/60 mt-2 max-w-2xl mx-auto">
            Desde clásicos atemporales hasta nuevas y audaces creaciones, cada platillo es una celebración de sabor.
            </p>
        </div>

        <Tabs defaultValue={menuCategories[0]} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-lg bg-black/50 border border-white/10 rounded-full p-1">
              {menuCategories.map((category) => (
                <TabsTrigger 
                  key={category} 
                  value={category} 
                  className="font-headline text-base text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-full"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {menuCategories.map((category) => (
            <TabsContent key={category} value={category}>
              {isLoading && <p className="text-center">Cargando menú...</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {menuItems && menuItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <MenuItemCard key={item.id} item={item as MenuItem} />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
