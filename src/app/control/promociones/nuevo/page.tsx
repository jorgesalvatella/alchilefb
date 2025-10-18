'use client';
import { PromotionForm } from '@/components/control/promotion-form';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { withAuth } from '@/firebase/withAuth';

function NewPromotionPage() {
  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Promociones', href: '/control/promociones' },
    { label: 'Nueva', href: '/control/promociones/nuevo' },
  ];

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Crear Nueva Promoción
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          Completa la información para crear un paquete o promoción especial.
        </p>
      </div>
      <PromotionForm />
    </div>
  );
}

export default withAuth(NewPromotionPage, 'admin');
