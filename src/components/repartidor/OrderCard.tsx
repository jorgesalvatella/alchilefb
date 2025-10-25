'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, DollarSign, Package, Clock } from 'lucide-react';

interface OrderCardProps {
  order: {
    id: string;
    status: string;
    shippingAddress: {
      name?: string;
      street: string;
      city?: string;
      phone?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    items: any[];
    totalVerified: number;
    paymentMethod: string;
  };
  eta?: string | null;
}

export function OrderCard({ order, eta }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Preparando':
        return 'bg-blue-600 hover:bg-blue-700 border-blue-500';
      case 'En Reparto':
        return 'bg-green-600 hover:bg-green-700 border-green-500';
      case 'Entregado':
        return 'bg-gray-600 hover:bg-gray-700 border-gray-500';
      default:
        return 'bg-gray-500 hover:bg-gray-600 border-gray-400';
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
      <Card className="hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer bg-gray-900/90 border-gray-700 text-white backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className={`${getStatusColor(order.status)} text-white font-semibold px-3 py-1 shadow-md`}>
              {getStatusIcon(order.status)} {order.status}
            </Badge>
            <span className="text-xs text-gray-400 font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {order.shippingAddress.name || 'Cliente'}
                </p>
                <p className="text-sm text-gray-300 truncate">
                  {order.shippingAddress.street}
                </p>
                {order.shippingAddress.city && (
                  <p className="text-xs text-gray-400">
                    {order.shippingAddress.city}
                  </p>
                )}
              </div>
            </div>

            {order.shippingAddress.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">
                  {order.shippingAddress.phone}
                </span>
              </div>
            )}

            {/* ETA Display */}
            {eta && (
              <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-md px-2 py-1">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-300 font-medium">
                  ETA: {eta}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="font-bold text-green-400">
                  ${order.totalVerified.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400">
                  • {order.paymentMethod === 'cash' ? 'Efectivo' : order.paymentMethod}
                </span>
              </div>

              <div className="flex items-center gap-1 text-gray-400">
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
