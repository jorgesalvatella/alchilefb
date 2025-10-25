'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderTracking } from '@/hooks/use-order-tracking';
import { OrderDetailMap } from '@/components/repartidor/OrderDetailMap';
import { DeliveryActions } from '@/components/repartidor/DeliveryActions';
import { CustomerInfo } from '@/components/repartidor/CustomerInfo';
import { OrderItems } from '@/components/repartidor/OrderItems';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, AlertCircle } from 'lucide-react';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

interface PageProps {
  params: Promise<{ id: string }>;
}

function OrderDetailPage({ params, user, claims }: PageProps & WithAuthProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const { order, driverLocation, isTracking, loading, error } = useOrderTracking({
    orderId,
    enabled: true,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preparando':
        return 'bg-blue-600 text-white border-blue-500';
      case 'En Reparto':
        return 'bg-green-600 text-white border-green-500';
      case 'Entregado':
        return 'bg-gray-600 text-white border-gray-500';
      default:
        return 'bg-gray-700 text-white border-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header Skeleton */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center gap-4 shadow">
          <Skeleton className="w-8 h-8 bg-white/20 rounded" />
          <Skeleton className="h-6 w-48 bg-white/20" />
        </header>

        {/* Content Skeleton */}
        <div className="p-4 space-y-6">
          <Skeleton className="h-10 w-32 bg-gray-800" />
          <Skeleton className="h-32 w-full rounded-lg bg-gray-800" />
          <Skeleton className="h-64 w-full rounded-lg bg-gray-800" />
          <Skeleton className="h-48 w-full rounded-lg bg-gray-800" />
          <Skeleton className="h-16 w-full rounded-lg bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold text-white mb-2">Error al cargar pedido</h2>
          <p className="text-gray-400 mb-6">{error || 'Pedido no encontrado'}</p>
          <Button onClick={() => router.back()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Page Title */}
      <div className="text-center mb-8 pt-32 px-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 transition-colors mb-6"
          aria-label="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Volver a Mis Pedidos</span>
        </button>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 break-words">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Pedido #{order.id.slice(-6).toUpperCase()}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto px-4">Detalles de entrega</p>
      </div>

      <div className="px-4 space-y-6 pb-32">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <Badge className={`${getStatusColor(order.status)} border px-4 py-2 text-sm font-semibold`}>
            {order.status}
          </Badge>
          {isTracking && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium">Tracking activo</span>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <CustomerInfo customer={order.shippingAddress} />

        {/* Map */}
        <div>
          <h2 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Ubicación del Cliente
          </h2>
          <OrderDetailMap
            address={order.shippingAddress}
            driverLocation={driverLocation}
            showDriverMarker={isTracking}
          />
        </div>

        {/* Order Items */}
        <OrderItems
          items={order.items}
          total={order.totalVerified || order.total}
          paymentMethod={order.paymentMethod}
        />

        {/* Delivery Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 shadow-lg z-20">
          <DeliveryActions order={order} />
        </div>
      </div>
    </main>
  );
}

export default withAuth(OrderDetailPage, 'repartidor');
