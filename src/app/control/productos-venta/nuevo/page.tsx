import { SaleProductForm } from '@/components/control/sale-product-form';
import { Breadcrumbs } from '@/components/ui/breadcrumb';

export default function NewSaleProductPage() {
  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Productos de Venta', href: '/control/productos-venta' },
    { label: 'Nuevo', href: '/control/productos-venta/nuevo' },
  ];

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Crear Nuevo Producto
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          Rellena la información para añadir un nuevo artículo al menú.
        </p>
      </div>
      <SaleProductForm />
    </div>
  );
}
