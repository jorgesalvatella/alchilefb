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

function MenuItemCard({ item }: { item: MenuItem }) {
  const image = PlaceHolderImages.find((img) => img.id === item.image);
  const imageUrl = item.imageUrl || image?.imageUrl || 'https://placehold.co/600x400';
  const imageHint = item.imageUrl ? item.name : image?.imageHint;

  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-primary/20 hover:scale-[1.02] shadow-lg">
      <CardHeader className="p-0">
        <Link href={`/menu/${item.id}`} className="block relative h-56 w-full">
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            data-ai-hint={imageHint}
          />
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="flex justify-between items-start">
            <h3 className="font-headline text-xl leading-tight">
              <Link href={`/menu/${item.id}`}>{item.name}</Link>
            </h3>
            <div className="flex items-center gap-0.5 text-sm text-amber-400 shrink-0 ml-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Flame key={i} size={14} className={i < item.spiceRating ? 'fill-current' : 'text-muted-foreground/30'} />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-1 mb-4 line-clamp-2">{item.description}</p>
        </div>
        <div className="flex justify-between items-end mt-2">
          <p className="text-lg font-bold text-primary">${item.price.toFixed(2)}</p>
          <Button size="sm" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="font-headline text-5xl md:text-6xl text-primary">Nuestro Menú</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Desde clásicos atemporales hasta nuevas y audaces creaciones, cada platillo es una celebración de sabor.
        </p>
      </div>

      <Tabs defaultValue={menuCategories[0]} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-md">
            {menuCategories.map((category) => (
              <TabsTrigger key={category} value={category} className="font-headline text-base">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {menuCategories.map((category) => (
          <TabsContent key={category} value={category}>
             {isLoading && <p className="text-center">Cargando menú...</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
  );
}
