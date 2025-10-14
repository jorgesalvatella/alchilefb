'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Activity, DollarSign, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

interface OrdersKPIsProps {
  stats: OrdersStatsData | null;
  isLoading: boolean;
}

export function OrdersKPIs({ stats, isLoading }: OrdersKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl bg-gray-700" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const kpis = [
    {
      title: 'Pedidos Hoy',
      value: stats.todayOrders,
      icon: ShoppingBag,
      subtitle: `${stats.todayOrdersChange > 0 ? '+' : ''}${stats.todayOrdersChange}% vs ayer`,
      trend: stats.todayOrdersChange,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
    },
    {
      title: 'Pedidos Activos',
      value: stats.activeOrders,
      icon: Activity,
      subtitle: `${stats.activeOrdersByStatus.Preparando} preparando, ${stats.activeOrdersByStatus['En Reparto']} en reparto`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      title: 'Ingresos del Día',
      value: `$${stats.todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      subtitle: `Ticket promedio: $${stats.averageTicket.toFixed(2)}`,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      title: 'Tiempo Promedio',
      value: `${stats.averageDeliveryTime} min`,
      icon: Clock,
      subtitle: 'Desde pedido hasta entrega',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const hasTrend = kpi.trend !== undefined;
        const isPositive = kpi.trend && kpi.trend > 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card
            key={index}
            className="bg-gray-900/50 border-gray-700 text-white hover:border-gray-600 transition-colors"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                {kpi.title}
              </CardTitle>
              <div className={`w-10 h-10 rounded-full ${kpi.bgColor} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-white">{kpi.value}</div>
                {hasTrend && (
                  <div className={`flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    <TrendIcon className="h-4 w-4 mr-1" />
                    {Math.abs(kpi.trend!)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-white/60 mt-1">{kpi.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
