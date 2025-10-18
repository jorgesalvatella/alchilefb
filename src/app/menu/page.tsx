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
import { PackageCard } from '@/components/menu/PackageCard';
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
  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SaleProduct | null>(null);
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        const [productsRes, categoriesRes, promotionsRes] = await Promise.all([
          fetch('/api/menu'),
          fetch('/api/categorias-venta'),
          fetch('/api/promotions'),
        ]);

        if (!productsRes.ok || !categoriesRes.ok) {
          throw new Error('No se pudo cargar el menú.');
        }

        const productsData = await productsRes.json();
        const categoriesData = await categoriesRes.json();
        const promotionsData = promotionsRes.ok ? await promotionsRes.json() : [];

        const packagesFiltered = promotionsData.filter((p: any) => p.type === 'package');

        setProducts(productsData);
        setCategories(categoriesData);
        // Filtrar solo paquetes (las promociones se aplican automáticamente)
        setPackages(packagesFiltered);
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

  // Agrupar productos regulares y paquetes por categoría
  const groupedCategories = categories
    .map(category => {
      const categoryProducts = products.filter(p => p.categoriaVentaId === category.id);
      const categoryPackages = packages.filter(p => p.categoryId === category.id);

      return {
        ...category,
        products: categoryProducts,
        packages: categoryPackages,
        totalItems: categoryProducts.length + categoryPackages.length,
      };
    })
    .filter(category => category.totalItems > 0);

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

    if (groupedCategories.length === 0) {
      return <p className="text-center text-gray-500 mt-8">No hay productos disponibles en este momento.</p>;
    }

    return (
      <Tabs defaultValue={groupedCategories[0]?.id} className="w-full mt-8">
        {/* Tabs mejoradas con estilos personalizados */}
        <TabsList className="inline-flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-lg bg-gray-900/50 p-2 backdrop-blur-sm border border-white/10">
          {groupedCategories.map(category => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:via-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:text-white/70 data-[state=inactive]:hover:text-white data-[state=inactive]:hover:bg-white/10 rounded-md px-6 py-3 font-bold transition-all duration-300"
            >
              {category.name}
              {category.totalItems > 0 && (
                <span className="ml-2 text-xs opacity-75">({category.totalItems})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {groupedCategories.map(category => (
          <TabsContent key={category.id} value={category.id} className="mt-8">
            {/* Sección de paquetes si existen */}
            {category.packages && category.packages.length > 0 && (
              <div className="mb-12">
                <h2 className="text-3xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text mb-6">
                  Paquetes Especiales
                </h2>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {category.packages.map((pkg: any) => (
                    <PackageCard key={pkg.id} package={pkg} />
                  ))}
                </div>
              </div>
            )}

            {/* Sección de productos regulares */}
            {category.products && category.products.length > 0 && (
              <div>
                {category.packages && category.packages.length > 0 && (
                  <h2 className="text-3xl font-black text-white mb-6">
                    Productos Individuales
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {category.products.map(product => (
                    <ProductCard key={product.id} product={product} onCustomize={handleCustomizeClick} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <>
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
              Nuestro Menú
            </span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
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