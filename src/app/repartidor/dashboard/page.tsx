'use client';

import { useState, useMemo } from 'react';
import { useDriverOrders } from '@/hooks/use-driver-orders';
import { useETACalculator } from '@/hooks/use-eta-calculator';
import { OrderCard } from '@/components/repartidor/OrderCard';
import { DriverStats } from '@/components/repartidor/DriverStats';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, RefreshCw, AlertCircle, ArrowUpDown, Calendar, MapPin, ListOrdered } from 'lucide-react';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

type SortOption = 'date' | 'distance' | 'status';

function DriverDashboard({ user, claims }: WithAuthProps) {
  const { orders, loading, error, refetch } = useDriverOrders();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress'>('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Prepare destinations for ETA calculation
  const destinations = useMemo(() => {
    return orders
      .filter(order => order.shippingAddress?.coordinates)
      .map(order => order.shippingAddress.coordinates!);
  }, [orders]);

  const { etas, loading: etaLoading, getETA, refetch: refetchETA } = useETACalculator({
    destinations,
    enabled: destinations.length > 0,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchETA()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Sort and filter orders
  const sortedAndFilteredOrders = useMemo(() => {
    // First filter
    let filtered = orders.filter((order) => {
      if (filter === 'pending') return order.status === 'Preparando';
      if (filter === 'in-progress') return order.status === 'En Reparto';
      return order.status === 'Preparando' || order.status === 'En Reparto';
    });

    // Then sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          // Newest first
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;

        case 'distance':
          // Closest first (by ETA duration)
          if (!a.shippingAddress?.coordinates || !b.shippingAddress?.coordinates) return 0;
          const etaA = getETA(a.shippingAddress.coordinates.lat, a.shippingAddress.coordinates.lng);
          const etaB = getETA(b.shippingAddress.coordinates.lat, b.shippingAddress.coordinates.lng);
          if (!etaA || !etaB) return 0;
          return etaA.durationInMinutes - etaB.durationInMinutes;

        case 'status':
          // Preparando first, then En Reparto
          const statusOrder = { 'Preparando': 1, 'En Reparto': 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 999) -
                 (statusOrder[b.status as keyof typeof statusOrder] || 999);

        default:
          return 0;
      }
    });
  }, [orders, filter, sortBy, getETA]);

  interface FilterButtonProps {
    filterType: 'all' | 'pending' | 'in-progress';
    label: string;
    count: number;
    currentFilter: 'all' | 'pending' | 'in-progress';
    setFilter: (filter: 'all' | 'pending' | 'in-progress') => void;
    activeColorClasses: string;
  }

  const FilterButton: React.FC<FilterButtonProps> = ({
    filterType,
    label,
    count,
    currentFilter,
    setFilter,
    activeColorClasses,
  }) => {
    const isActive = currentFilter === filterType;
    return (
      <Button
        size="sm"
        onClick={() => setFilter(filterType)}
        variant={isActive ? 'default' : 'outline'}
        className={isActive ? activeColorClasses : 'text-muted-foreground hover:bg-accent/10'}
      >
        {label} ({count})
      </Button>
    );
  };


  if (loading) {
    return (
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        {/* Page Title Skeleton */}
        <div className="text-center mb-12">
          <Skeleton className="h-16 w-3/4 mx-auto mb-4 bg-gray-700" />
          <Skeleton className="h-6 w-1/2 mx-auto bg-gray-600" />
        </div>

        {/* Stats Skeleton */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg bg-gray-700" />
            ))}
          </div>
        </div>

        {/* Orders Skeleton */}
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg bg-gray-700" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error al cargar pedidos</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={handleRefresh} className="bg-orange-500 text-white hover:bg-orange-600 font-bold">
            <RefreshCw className="w-4 h-4 mr-2" />
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Page Title and Subtitle */}
      <div className="text-center mb-8 pt-32 px-4">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 break-words">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Mis Pedidos
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto px-4">Panel de entregas</p>
      </div>

      {/* Stats */}
      <DriverStats orders={orders} />

      {/* Refresh Button in Body */}
      <div className="p-4 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleRefresh}
                              disabled={isRefreshing}
                              className="text-orange-500 border-orange-500 hover:bg-orange-500/10"
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                              Actualizar
                            </Button>      </div>

      {/* Filters and Sort */}
      <div className="border-b sticky top-[112px] z-10 shadow-sm bg-gray-900/95 backdrop-blur-sm border-gray-700 max-w-full">
        <div className="px-4 py-3">
          {/* Filters */}
          <div className="flex gap-2 mb-3 pb-3 border-b border-gray-700 scrollbar-hide" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex gap-2 min-w-max">
              <FilterButton
                filterType="all"
                label="Todos"
                count={orders.length}
                currentFilter={filter}
                setFilter={setFilter}
                activeColorClasses="bg-orange-500 hover:bg-orange-600 text-white"
              />
              <FilterButton
                filterType="pending"
                label="Pendientes"
                count={orders.filter((o) => o.status === 'Preparando').length}
                currentFilter={filter}
                setFilter={setFilter}
                activeColorClasses="bg-orange-500 hover:bg-orange-600 text-white"
              />
              <FilterButton
                filterType="in-progress"
                label="En Camino"
                count={orders.filter((o) => o.status === 'En Reparto').length}
                currentFilter={filter}
                setFilter={setFilter}
                activeColorClasses="bg-orange-500 hover:bg-orange-600 text-white"
              />
            </div>
          </div>

          {/* Sort Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
              <ArrowUpDown className="w-3 h-3" />
              Ordenar:
            </span>
            <div className="flex gap-2 scrollbar-hide flex-1" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex gap-2 min-w-max">
                <Button
                  size="sm"
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                  onClick={() => setSortBy('date')}
                  className={sortBy === 'date' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-300 border-gray-600'}
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Fecha
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === 'distance' ? 'default' : 'outline'}
                  onClick={() => setSortBy('distance')}
                  className={sortBy === 'distance' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-300 border-gray-600'}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Cercanía
                </Button>
                <Button
                  size="sm"
                  variant={sortBy === 'status' ? 'default' : 'outline'}
                  onClick={() => setSortBy('status')}
                  className={sortBy === 'status' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-300 border-gray-600'}
                >
                  <ListOrdered className="w-3 h-3 mr-1" />
                  Estado
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {sortedAndFilteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {filter === 'all' && 'No tienes pedidos asignados'}
              {filter === 'pending' && 'No hay pedidos pendientes'}
              {filter === 'in-progress' && 'No hay pedidos en camino'}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {filter === 'all'
                ? 'Los nuevos pedidos asignados aparecerán aquí'
                : 'Cambia el filtro para ver otros pedidos'}
            </p>
            {filter !== 'all' && (
              <Button onClick={() => setFilter('all')} variant="outline" className="text-orange-500 border-orange-500 hover:bg-orange-500/10">
                Ver todos los pedidos
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">
                {sortedAndFilteredOrders.length} {sortedAndFilteredOrders.length === 1 ? 'pedido' : 'pedidos'}
                {filter !== 'all' && ` en ${filter === 'pending' ? 'Pendientes' : 'En Camino'}`}
              </p>
              {etaLoading && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Calculando ETAs...
                </span>
              )}
            </div>
            {sortedAndFilteredOrders.map((order) => {
              const eta = order.shippingAddress?.coordinates
                ? getETA(order.shippingAddress.coordinates.lat, order.shippingAddress.coordinates.lng)
                : null;

              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  eta={eta?.duration || null}
                />
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}

export default withAuth(DriverDashboard, 'repartidor');
