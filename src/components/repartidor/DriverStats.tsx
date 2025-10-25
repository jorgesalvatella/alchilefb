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
    <div className="p-4 border-b border-gray-700">
      <div className="grid grid-cols-3 gap-3">
        {/* Pendientes - Gradiente Azul vibrante */}
        <Card className="p-3 text-center bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 shadow-lg hover:shadow-xl transition-shadow">
          <Package className="w-6 h-6 mx-auto mb-1 text-white drop-shadow-md" />
          <p className="text-2xl font-bold text-white drop-shadow-md">{pendingOrders.length}</p>
          <p className="text-xs text-blue-100 font-medium">Pendientes</p>
        </Card>

        {/* En Camino - Gradiente Verde vibrante */}
        <Card className="p-3 text-center bg-gradient-to-br from-green-500 to-green-700 border-green-400 shadow-lg hover:shadow-xl transition-shadow">
          <Clock className="w-6 h-6 mx-auto mb-1 text-white drop-shadow-md" />
          <p className="text-2xl font-bold text-white drop-shadow-md">{inProgressOrders.length}</p>
          <p className="text-xs text-green-100 font-medium">En Camino</p>
        </Card>

        {/* Completados - Gradiente Naranja/Rojo "Al Chile" */}
        <Card className="p-3 text-center bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-orange-400 shadow-lg hover:shadow-xl transition-shadow">
          <CheckCircle className="w-6 h-6 mx-auto mb-1 text-white drop-shadow-md" />
          <p className="text-2xl font-bold text-white drop-shadow-md">{completedToday.length}</p>
          <p className="text-xs text-orange-100 font-medium">Hoy</p>
        </Card>
      </div>
    </div>
  );
}
