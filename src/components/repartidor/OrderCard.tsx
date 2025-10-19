'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, DollarSign, Package } from 'lucide-react';

interface OrderCardProps {
  order: {
    id: string;
    status: string;
    shippingAddress: {
      name?: string;
      street: string;
      city?: string;
      phone?: string;
    };
    items: any[];
    totalVerified: number;
    paymentMethod: string;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preparando':
        return 'bg-blue-500';
      case 'En Reparto':
        return 'bg-green-500';
      case 'Entregado':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Preparando':
        return '🔵';
      case 'En Reparto':
        return '🟢';
      case 'Entregado':
        return '✅';
      default:
        return '⚪';
    }
  };

  return (
    <Link href={`/repartidor/pedidos/${order.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className={`${getStatusColor(order.status)} text-white`}>
              {getStatusIcon(order.status)} {order.status}
            </Badge>
            <span className="text-xs text-gray-500">
              #{order.id.slice(0, 8)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {order.shippingAddress.name || 'Cliente'}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {order.shippingAddress.street}
                </p>
                {order.shippingAddress.city && (
                  <p className="text-xs text-gray-500">
                    {order.shippingAddress.city}
                  </p>
                )}
              </div>
            </div>

            {order.shippingAddress.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {order.shippingAddress.phone}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-600">
                  ${order.totalVerified.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500">
                  • {order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod}
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-600">
                <Package className="w-4 h-4" />
                <span className="text-sm">
                  {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
