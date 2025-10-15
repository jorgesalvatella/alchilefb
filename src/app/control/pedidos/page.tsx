'use client';

import { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus } from '@/lib/types';
import { OrdersKPIs } from '@/components/orders/OrdersKPIs';
import { OrdersFilters } from '@/components/orders/OrdersFilters';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { OrderDetailsSheet } from '@/components/orders/OrderDetailsSheet';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface OrdersStatsData {
  todayOrders: number;
  todayOrdersChange: number;
  activeOrders: number;
  activeOrdersByStatus: {
    Preparando: number;
    'En Reparto': number;
  };
  todayRevenue: number;
  averageTicket: number;
  averageDeliveryTime: number;
  deliveryTimeUnit: string;
}

interface StatusCounts {
  all?: number;
  'Pedido Realizado'?: number;
  'Preparando'?: number;
  'En Reparto'?: number;
  'Entregado'?: number;
  'Cancelado'?: number;
}

export default function AdminOrdersPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const router = useRouter();

  // State for orders and stats
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrdersStatsData | null>(null);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // State for filters
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');

  // State for details sheet
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Debounce search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setIsLoadingOrders(true);
    try {
      const token = await user.getIdToken();

      // Build query params
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }

      // Calculate date range based on filter
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        params.append('startDate', startOfDay.toISOString());
      } else if (dateFilter === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7));
        params.append('startDate', startOfWeek.toISOString());
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.setMonth(now.getMonth() - 1));
        params.append('startDate', startOfMonth.toISOString());
      }

      const response = await fetch(`/api/pedidos/control?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar pedidos');
      }

      const data = await response.json();
      setOrders(data.orders || []);

      // Calculate status counts
      const counts: StatusCounts = {
        all: data.orders?.length || 0,
      };

      data.orders?.forEach((order: Order) => {
        counts[order.status] = (counts[order.status] || 0) + 1;
      });

      setStatusCounts(counts);
    } catch (error) {
      toast.error('Error al cargar los pedidos');
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user, selectedStatus, debouncedSearchTerm, dateFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!user) return;

    setIsLoadingStats(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/pedidos/control/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error al cargar las estadísticas');
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/ingresar');
      return;
    }

    if (user) {
      fetchOrders();
      fetchStats();
    }
  }, [user, authLoading, router, fetchOrders, fetchStats]);

  // Reload orders when filters change
  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [selectedStatus, debouncedSearchTerm, dateFilter, user, fetchOrders]);

  // Handle view details
  const handleViewDetails = async (orderId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/pedidos/control/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar detalles del pedido');
      }

      const data = await response.json();
      setSelectedOrder(data.order);
      setIsSheetOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Error al cargar los detalles del pedido');
    }
  };

  // Handle status change
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/pedidos/control/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado');
      }

      toast.success('Estado actualizado correctamente');

      // Refresh orders and stats
      await fetchOrders();
      await fetchStats();

      // Update selected order if it's open
      if (selectedOrder?.id === orderId) {
        await handleViewDetails(orderId);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
      throw error;
    }
  };

  // Handle cancel order
  const handleCancelOrder = async (orderId: string, reason: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();

      const response = await fetch(`/api/pedidos/control/${orderId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Error al cancelar el pedido');
      }

      toast.success('Pedido cancelado correctamente');

      // Refresh orders and stats
      await fetchOrders();
      await fetchStats();

      // Close the sheet
      setIsSheetOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar el pedido');
      throw error;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
              Hub de Pedidos
            </span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Centro de comando para gestionar y monitorear todos los pedidos en tiempo real
          </p>
        </div>

        {/* KPIs Section */}
        <OrdersKPIs stats={stats} isLoading={isLoadingStats} />

        {/* Filters Section */}
        <OrdersFilters
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          statusCounts={statusCounts}
        />

        {/* Orders Table */}
        <OrdersTable
          orders={orders}
          isLoading={isLoadingOrders}
          onViewDetails={handleViewDetails}
        />

        {/* Order Details Sheet */}
        <OrderDetailsSheet
          order={selectedOrder}
          isOpen={isSheetOpen}
          onClose={() => {
            setIsSheetOpen(false);
            setSelectedOrder(null);
          }}
          onStatusChange={handleStatusChange}
          onCancelOrder={handleCancelOrder}
        />
      </div>
    </div>
  );
}
