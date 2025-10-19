'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

interface Promotion {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  type: 'promotion' | 'package';
}

type FeaturedItem = (Product | Promotion) & {
  itemType: 'product' | 'promotion';
}

export const FeaturedProducts = () => {
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedItems = async () => {
      try {
        // Fetch both products and promotions in parallel
        const [productsResponse, promotionsResponse] = await Promise.all([
          fetch('/api/productos-venta/latest'),
          fetch('/api/promotions/featured')
        ]);

        let products: Product[] = [];
        let promotions: Promotion[] = [];

        // Handle products response
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          products = Array.isArray(productsData) ? productsData : [];
        } else {
          console.error('Error al obtener productos destacados:', productsResponse.status);
        }

        // Handle promotions response
        if (promotionsResponse.ok) {
          const promotionsData = await promotionsResponse.json();
          promotions = Array.isArray(promotionsData) ? promotionsData : [];
        } else {
          console.error('Error al obtener promociones destacadas:', promotionsResponse.status);
        }

        // Combine products and promotions with type identifier
        const combined: FeaturedItem[] = [
          ...products.map(p => ({ ...p, itemType: 'product' as const })),
          ...promotions.map(p => ({ ...p, itemType: 'promotion' as const }))
        ];

        setFeaturedItems(combined);
      } catch (error) {
        console.error('Error fetching featured items:', error);
        // En caso de error de red, mostrar array vacío
        setFeaturedItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedItems();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-black rounded-3xl shadow-2xl p-4 lg:p-8 border-2 border-transparent">
            <Skeleton className="h-48 lg:h-64 w-full mb-4 lg:mb-6 rounded-2xl" />
            <Skeleton className="h-6 lg:h-8 w-3/4 mb-3 lg:mb-4" />
            <Skeleton className="h-16 lg:h-20 w-full mb-4 lg:mb-6" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 lg:h-10 w-1/3" />
              <Skeleton className="h-10 lg:h-12 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!featuredItems || featuredItems.length === 0) {
    return (
      <div className="text-center text-gray-500 py-16">
        <p className="mb-8 text-lg">No hay productos destacados en este momento. ¡Pero nuestro menú está lleno de sorpresas!</p>
        <Button asChild size="lg" className="bg-gradient-to-r from-fresh-green to-yellow-600 text-white font-black text-xl py-7 px-14 rounded-full hover:scale-110 transition-transform duration-300 shadow-xl">
          <Link href="/menu">Ir al Menú</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
        {featuredItems.map((item) => {
          const isPromotion = item.itemType === 'promotion';
          const href = isPromotion ? `/menu?promotion=${item.id}` : `/menu?product=${item.id}`;

          return (
            <div key={`${item.itemType}-${item.id}`} className="group relative bg-black rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-chile-red/30 hover:scale-105 border-2 border-transparent hover:border-chile-red/50 fade-in-up">
              {/* Badge para promociones */}
              {isPromotion && (
                <div className="absolute top-3 right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold z-10 shadow-lg">
                  PROMOCIÓN
                </div>
              )}

              <Image
                src={item.imageUrl || PlaceHolderImages.DEFAULT_IMAGE_URL}
                alt={item.name}
                width={600}
                height={400}
                className="w-full h-48 lg:h-64 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="p-4 lg:p-8">
                <h3 className="text-xl lg:text-3xl font-black text-white mb-2 lg:mb-4 truncate" title={item.name}>
                  {item.name}
                </h3>
                <p className="text-gray-300 text-sm lg:text-base mb-4 lg:mb-6 leading-relaxed h-16 lg:h-24 overflow-hidden text-ellipsis">
                  {item.description}
                </p>
                <div className="flex justify-between items-center mt-2 lg:mt-4">
                  <p className="text-2xl lg:text-3xl font-bold text-white">${item.price.toFixed(2)}</p>
                  <Button asChild className="bg-chile-red hover:bg-red-700 text-white font-bold py-2 px-3 lg:py-3 lg:px-5 rounded-lg transition-transform hover:scale-105 text-sm lg:text-base">
                    <Link href={href}>Ver</Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-20">
        <Button asChild size="lg" className="bg-gradient-to-r from-fresh-green to-yellow-600 text-white font-black text-xl py-7 px-14 rounded-full hover:scale-110 transition-transform duration-300 shadow-xl">
          <Link href="/menu">Ver Menú Completo</Link>
        </Button>
      </div>
    </>
  );
};
