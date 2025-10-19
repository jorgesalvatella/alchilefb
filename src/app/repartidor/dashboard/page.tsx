'use client';

import { useState } from 'react';
import { useDriverOrders } from '@/hooks/use-driver-orders';
import { OrderCard } from '@/components/repartidor/OrderCard';
import { DriverStats } from '@/components/repartidor/DriverStats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, RefreshCw, AlertCircle } from 'lucide-react';

export default function DriverDashboard() {
  const { orders, loading, error, refetch } = useDriverOrders();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress'>('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending') return order.status === 'Preparando';
    if (filter === 'in-progress') return order.status === 'En Reparto';
    return order.status === 'Preparando' || order.status === 'En Reparto';
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg">
          <Skeleton className="h-8 w-48 bg-white/20" />
          <Skeleton className="h-4 w-64 mt-2 bg-white/20" />
        </header>

        {/* Stats Skeleton */}
        <div className="p-4 bg-white border-b">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Orders Skeleton */}
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar pedidos</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-7 h-7" />
              Mis Pedidos
            </h1>
            <p className="text-blue-100 text-sm mt-1">Panel de entregas</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Stats */}
      <DriverStats orders={orders} />

      {/* Filters */}
      <div className="p-4 bg-white border-b sticky top-[112px] z-10 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          <Button
            size="sm"
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'outline'}
            className={
              filter === 'all'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }
          >
            Todos ({orders.length})
          </Button>
          <Button
            size="sm"
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'default' : 'outline'}
            className={
              filter === 'pending'
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }
          >
            Pendientes ({orders.filter((o) => o.status === 'Preparando').length})
          </Button>
          <Button
            size="sm"
            onClick={() => setFilter('in-progress')}
            variant={filter === 'in-progress' ? 'default' : 'outline'}
            className={
              filter === 'in-progress'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }
          >
            En Camino ({orders.filter((o) => o.status === 'En Reparto').length})
          </Button>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {filter === 'all' && 'No tienes pedidos asignados'}
              {filter === 'pending' && 'No hay pedidos pendientes'}
              {filter === 'in-progress' && 'No hay pedidos en camino'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {filter === 'all'
                ? 'Los nuevos pedidos asignados aparecerán aquí'
                : 'Cambia el filtro para ver otros pedidos'}
            </p>
            {filter !== 'all' && (
              <Button onClick={() => setFilter('all')} variant="outline">
                Ver todos los pedidos
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
              {filter !== 'all' && ` en ${filter === 'pending' ? 'Pendientes' : 'En Camino'}`}
            </p>
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
