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

export const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/productos-venta/latest');
        if (!response.ok) {
          throw new Error('Failed to fetch latest products');
        }
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching latest products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 max-w-7xl mx-auto">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-black rounded-3xl shadow-2xl p-8 border-2 border-transparent">
            <Skeleton className="h-64 w-full mb-6 rounded-2xl" />
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-20 w-full mb-6" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-12 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
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
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 max-w-7xl mx-auto">
        {products.map((product) => (
          <div key={product.id} className="group relative bg-black rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-chile-red/30 hover:scale-105 border-2 border-transparent hover:border-chile-red/50 fade-in-up">
            <Image 
              src={product.imageUrl || PlaceHolderImages.DEFAULT_IMAGE_URL} 
              alt={product.name} 
              width={600} 
              height={400} 
              className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="p-8">
              <h3 className="text-3xl font-black text-white mb-4 truncate" title={product.name}>{product.name}</h3>
              <p className="text-gray-300 text-base mb-6 leading-relaxed h-24 overflow-hidden text-ellipsis">
                {product.description}
              </p>
              <div className="flex justify-between items-center mt-4">
                <p className="text-3xl font-bold text-white">${product.price.toFixed(2)}</p>
                <Button asChild className="bg-chile-red hover:bg-red-700 text-white font-bold py-3 px-5 rounded-lg transition-transform hover:scale-105">
                  <Link href={`/menu?product=${product.id}`}>Ver</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-20">
        <Button asChild size="lg" className="bg-gradient-to-r from-fresh-green to-yellow-600 text-white font-black text-xl py-7 px-14 rounded-full hover:scale-110 transition-transform duration-300 shadow-xl">
          <Link href="/menu">Ver Menú Completo</Link>
        </Button>
      </div>
    </>
  );
};
