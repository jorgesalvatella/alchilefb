'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StorageImage from '@/components/StorageImage';
import { useCart } from '@/context/cart-context';
import { Package as PackageIcon, Tag } from 'lucide-react';
import Image from 'next/image';

interface PackageItem {
  productId: string;
  name: string;
  quantity: number;
}

interface PackageData {
  id: string;
  name: string;
  description: string;
  type: 'package' | 'promotion';
  packagePrice?: number;
  packageItems?: PackageItem[];
  imagePath?: string;
  imageUrl?: string;
  promoType?: 'percentage' | 'fixed_amount';
  promoValue?: number;
  appliesTo?: 'product' | 'category' | 'total_order';
}

export function PackageCard({ package: pkg }: { package: PackageData }) {
  const { addItem } = useCart();

  console.log('[PackageCard] Package data:', pkg);
  console.log('[PackageCard] imageUrl:', pkg.imageUrl);
  console.log('[PackageCard] imagePath:', pkg.imagePath);

  const handleAddToCart = () => {
    if (pkg.type === 'package' && pkg.packagePrice) {
      const finalImageUrl = pkg.imageUrl || pkg.imagePath;
      console.log('[PackageCard] Adding package to cart:', {
        name: pkg.name,
        imageUrl: pkg.imageUrl,
        imagePath: pkg.imagePath,
        finalImageUrl
      });
      addItem({
        id: pkg.id,
        name: pkg.name,
        price: pkg.packagePrice,
        quantity: 1,
        imageUrl: finalImageUrl,
        isPackage: true,
        packageItems: pkg.packageItems,
      });
    }
  };

  // Si es una promoción automática, no la mostramos como card independiente
  if (pkg.type === 'promotion') {
    return null;
  }

  return (
    <Card className="relative flex flex-col overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl group bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-orange-500/30 text-white">
      {/* Badge de Paquete */}
      <div className="absolute top-4 left-4 z-10">
        <Badge className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold px-3 py-1 shadow-lg">
          <PackageIcon className="h-3 w-3 mr-1" />
          PAQUETE
        </Badge>
      </div>

      {/* Badge de Ahorro (si aplicable) */}
      {pkg.packageItems && pkg.packagePrice && (
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-green-600 text-white font-bold px-3 py-1 shadow-lg animate-pulse">
            <Tag className="h-3 w-3 mr-1" />
            AHORRA
          </Badge>
        </div>
      )}

      <CardHeader className="p-0">
        <div className="relative w-full aspect-square overflow-hidden">
          <StorageImage
            filePath={pkg.imageUrl || pkg.imagePath || ''}
            alt={pkg.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            objectFit="contain"
            className="transition-transform duration-500 group-hover:scale-110"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-6 space-y-4">
        <h3 className="text-2xl font-black text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text">
          {pkg.name}
        </h3>

        <p className="text-sm text-white/80 line-clamp-2">
          {pkg.description}
        </p>

        {/* Productos incluidos */}
        {pkg.packageItems && pkg.packageItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
              Incluye:
            </p>
            <ul className="space-y-1">
              {pkg.packageItems.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-center text-sm text-white/70">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                  <span className="font-semibold text-orange-300">{item.quantity}x</span>
                  <span className="ml-1">{item.name}</span>
                </li>
              ))}
              {pkg.packageItems.length > 3 && (
                <li className="text-xs text-white/50 italic ml-4">
                  +{pkg.packageItems.length - 3} productos más...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Precio */}
        <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/10">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wide">Precio del Paquete</p>
            <p className="text-3xl font-black text-white">
              ${pkg.packagePrice?.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button
          onClick={handleAddToCart}
          className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-black text-lg py-6 hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 hover:scale-105"
        >
          Añadir al Carrito
        </Button>
      </CardFooter>
    </Card>
  );
}
