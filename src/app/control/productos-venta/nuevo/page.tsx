import { SaleProductForm } from '@/components/control/sale-product-form';
import { Breadcrumbs } from '@/components/ui/breadcrumb';

export default function NewSaleProductPage() {
  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Productos de Venta', href: '/control/productos-venta' },
    { label: 'Nuevo', href: '/control/productos-venta/nuevo' },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Crear Nuevo Producto
          </span>
        </h1>
        <p className="text-white/70 text-lg mt-2">
          Rellena la información para añadir un nuevo artículo al menú.
        </p>
      </div>
      <SaleProductForm />
    </>
  );
}
