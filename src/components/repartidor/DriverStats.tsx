'use client';

import { Card } from '@/components/ui/card';
import { Package, Clock, CheckCircle } from 'lucide-react';

interface DriverStatsProps {
  orders: Array<{
    status: string;
    createdAt: any;
  }>;
}

export function DriverStats({ orders }: DriverStatsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(order => {
    const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    return orderDate >= today;
  });

  const pendingOrders = orders.filter(order => order.status === 'Preparando');
  const inProgressOrders = orders.filter(order => order.status === 'En Reparto');
  const completedToday = todayOrders.filter(order => order.status === 'Entregado');

  return (
    <div className="p-4 bg-white border-b">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center bg-blue-50 border-blue-200">
          <Package className="w-6 h-6 mx-auto mb-1 text-blue-600" />
          <p className="text-2xl font-bold text-blue-600">{pendingOrders.length}</p>
          <p className="text-xs text-gray-600">Pendientes</p>
        </Card>

        <Card className="p-3 text-center bg-green-50 border-green-200">
          <Clock className="w-6 h-6 mx-auto mb-1 text-green-600" />
          <p className="text-2xl font-bold text-green-600">{inProgressOrders.length}</p>
          <p className="text-xs text-gray-600">En Camino</p>
        </Card>

        <Card className="p-3 text-center bg-gray-50 border-gray-200">
          <CheckCircle className="w-6 h-6 mx-auto mb-1 text-gray-600" />
          <p className="text-2xl font-bold text-gray-600">{completedToday.length}</p>
          <p className="text-xs text-gray-600">Hoy</p>
        </Card>
      </div>
    </div>
  );
}
