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
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'En Reparto':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Entregado':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header Skeleton */}
        <header className="bg-blue-600 text-white p-4 flex items-center gap-4 shadow">
          <Skeleton className="w-8 h-8 bg-white/20 rounded" />
          <Skeleton className="h-6 w-48 bg-white/20" />
        </header>

        {/* Content Skeleton */}
        <div className="p-4 space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar pedido</h2>
          <p className="text-gray-600 mb-6">{error || 'Pedido no encontrado'}</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center gap-4 shadow-lg sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-blue-100 text-sm">Detalles de entrega</p>
        </div>
      </header>

      <div className="p-4 space-y-6 pb-24">
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <DeliveryActions order={order} />
        </div>
      </div>
    </div>
  );
}

export default withAuth(OrderDetailPage, 'repartidor');
