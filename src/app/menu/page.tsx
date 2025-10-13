'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { SaleProduct } from '@/lib/types';
import StorageImage from '@/components/StorageImage';
import { useCart } from '@/context/cart-context';
import { ProductCustomizationDialog } from '@/components/menu/ProductCustomizationDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ProductCard({ product, onCustomize }: { product: SaleProduct; onCustomize: (product: SaleProduct) => void; }) {
  const { addItem } = useCart();

  const hasCustomizations = 
    (product.ingredientesBase && product.ingredientesBase.length > 0) || 
    (product.ingredientesExtra && product.ingredientesExtra.length > 0);

  const handleActionClick = () => {
    if (hasCustomizations) {
      onCustomize(product);
    } else {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      });
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-lg group bg-gray-900/50 border-gray-700 text-white">
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
        <h3 className="text-lg font-bold text-orange-400">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm text-white/70">{product.description}</p>
        <p className="mt-4 text-xl font-semibold text-white">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          onClick={handleActionClick}
          className="w-full bg-orange-500 text-white hover:bg-orange-600 font-bold"
        >
          {hasCustomizations ? 'Personalizar y Añadir' : 'Añadir al Carrito'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-48 w-full rounded-xl bg-gray-700" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-gray-600" />
        <Skeleton className="h-4 w-1/2 bg-gray-600" />
        <Skeleton className="h-8 w-1/4 mt-4 bg-gray-600" />
      </div>
       <Skeleton className="h-10 w-full mt-4 bg-gray-700" />
    </div>
  );
}

export default function MenuPage() {
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SaleProduct | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

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
        console.log('>>> DEBUG: Datos de productos recibidos del backend:', JSON.stringify(productsData, null, 2));
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

  const handleCustomizeClick = (product: SaleProduct) => {
    setSelectedProduct(product);
    setIsCustomizationOpen(true);
  };

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
      <Tabs defaultValue={groupedProducts[0]?.id} className="w-full mt-8">
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
                <ProductCard key={product.id} product={product} onCustomize={handleCustomizeClick} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <>
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white">Nuestro Menú</h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent font-black">
            Hecho con los ingredientes más frescos y el auténtico sabor de México.
          </p>
        </div>
        {renderContent()}
      </main>
      <ProductCustomizationDialog 
        product={selectedProduct}
        isOpen={isCustomizationOpen}
        onOpenChange={setIsCustomizationOpen}
      />
    </>
  );
}