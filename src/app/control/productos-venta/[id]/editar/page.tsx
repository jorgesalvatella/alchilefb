'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from '@/firebase/provider';
import { SaleProductForm } from '@/components/control/sale-product-form';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import type { SaleProduct } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditSaleProductPage() {
  const { user } = useUser();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<SaleProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Productos de Venta', href: '/control/productos-venta' },
    { label: product?.name || 'Editar', href: `/control/productos-venta/${productId}/editar` },
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      if (!user || !productId) return;
      setIsLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/control/productos-venta/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('No se pudo obtener la información del producto.');
        }
        setProduct(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [user, productId]);

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Editar Producto
          </span>
        </h1>
        <p className="text-white/70 text-lg mt-2">
          Modifica la información del artículo del menú.
        </p>
      </div>
      
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      )}
      {error && <p className="text-center text-red-500">{error}</p>}
      {!isLoading && !error && product && <SaleProductForm product={product} />}
    </>
  );
}
