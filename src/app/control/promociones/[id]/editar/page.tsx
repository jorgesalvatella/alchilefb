'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PromotionForm } from '@/components/control/promotion-form';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

interface ProductItem {
  productId: string;
  quantity: number;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'package' | 'promotion';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  packagePrice?: number;
  products?: ProductItem[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  appliesTo?: 'product' | 'category' | 'total_order';
  targetIds?: string[];
}

function EditPromotionPage({ user }: WithAuthProps) {
  const params = useParams();
  const promotionId = params.id as string;

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Promociones', href: '/control/promociones' },
    { label: promotion?.name || 'Editar', href: `/control/promociones/${promotionId}/editar` },
  ];

  useEffect(() => {
    const fetchPromotion = async () => {
      if (!user || !promotionId) return;
      setIsLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/control/promotions/${promotionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('No se pudo obtener la información de la promoción.');
        }
        setPromotion(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPromotion();
  }, [user, promotionId]);

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Editar Promoción
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          Modifica la información del paquete o promoción.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full bg-white/10" />
          <Skeleton className="h-64 w-full bg-white/10" />
        </div>
      )}
      {error && <p className="text-center text-red-500">{error}</p>}
      {!isLoading && !error && promotion && <PromotionForm promotion={promotion} />}
    </div>
  );
}

export default withAuth(EditPromotionPage, 'admin');
