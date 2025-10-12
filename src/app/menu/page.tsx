'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { SaleProduct, SaleCategory } from '@/lib/data';
import StorageImage from '@/components/StorageImage';

import { useCart } from '@/context/cart-context';

function ProductCard({ product }: { product: SaleProduct }) {
  const { addToCart } = useCart();

  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-lg group">
      <CardHeader className="p-0">
        <div className="relative h-48 w-full">
          <StorageImage
            filePath={product.imageUrl || PlaceHolderImages.getRandomImage(product.name).imageUrl}
            alt={product.name}
            fill
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm text-gray-500">{product.description}</p>
        <p className="mt-4 text-xl font-semibold">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={() => addToCart(product)}
          className="w-full bg-fresh-green text-black hover:bg-fresh-green/80"
        >
          Añadir al Carrito
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-1/4 mt-4" />
      </div>
       <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ... (ProductCard and ProductSkeleton remain the same)

export default function MenuPage() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [categories, setCategories] = useState<SaleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/menu'),
          fetch('/api/categorias-venta'),
        ]);

        if (!productsRes.ok || !categoriesRes.ok) {
          throw new Error('No se pudo cargar el menú.');
        }

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();

        setProducts(productsData);
        setCategories(categoriesData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenuData();
  }, []);

  const groupedProducts = categories
    .map(category => ({
      ...category,
      products: products.filter(p => p.categoriaVentaId === category.id),
    }))
    .filter(category => category.products.length > 0);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-8">
          {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      );
    }

    if (error) {
      return <p className="text-center text-red-500 mt-8">Error: {error}</p>;
    }

    if (groupedProducts.length === 0) {
      return <p className="text-center text-gray-500 mt-8">No hay productos disponibles en este momento.</p>;
    }

    return (
      <Tabs defaultValue={groupedProducts[0].id} className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {groupedProducts.map(category => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {groupedProducts.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">Nuestro Menú</h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
          Hecho con los ingredientes más frescos y el auténtico sabor de México.
        </p>
      </div>
      {renderContent()}
    </main>
  );
}