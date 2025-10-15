'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Order, OrderStatus } from '@/lib/types';
import { Eye, MapPin, User, Phone } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onViewDetails: (orderId: string) => void;
}

export function OrdersTable({ orders, isLoading, onViewDetails }: OrdersTableProps) {
  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig: Record<OrderStatus, { className: string; label: string }> = {
      'Pedido Realizado': {
        className: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/50',
        label: 'Recibido',
      },
      'Preparando': {
        className: 'bg-orange-600/20 text-orange-400 border-orange-500/50',
        label: 'Preparando',
      },
      'En Reparto': {
        className: 'bg-blue-600/20 text-blue-400 border-blue-500/50',
        label: 'En Reparto',
      },
      'Entregado': {
        className: 'bg-green-600/20 text-green-400 border-green-500/50',
        label: 'Entregado',
      },
      'Cancelado': {
        className: 'bg-red-600/20 text-red-400 border-red-500/50',
        label: 'Cancelado',
      },
    };

    const config = statusConfig[status] || {
      className: 'bg-gray-600/20 text-gray-400 border-gray-500/50',
      label: status || 'Desconocido',
    };

    return (
      <Badge variant="outline" className={`${config.className} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';

    let date: Date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatAddress = (shippingAddress: any) => {
    if (typeof shippingAddress === 'string') {
      if (shippingAddress === 'whatsapp') {
        return 'Coordinación WhatsApp';
      }
      if (shippingAddress.startsWith('http')) {
        return 'Ubicación GPS';
      }
      return shippingAddress;
    }

    if (shippingAddress && typeof shippingAddress === 'object') {
      const { street, city } = shippingAddress;
      return street && city ? `${street}, ${city}` : '-';
    }

    return '-';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} data-testid="loading-skeleton" className="h-16 w-full bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              No se encontraron pedidos
            </h3>
            <p className="text-sm text-white/60">
              Intenta ajustar los filtros o la búsqueda
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700 hover:bg-gray-800/50">
            <TableHead className="text-white/80 font-semibold">ID</TableHead>
            <TableHead className="text-white/80 font-semibold">Cliente</TableHead>
            <TableHead className="text-white/80 font-semibold">Fecha</TableHead>
            <TableHead className="text-white/80 font-semibold">Dirección</TableHead>
            <TableHead className="text-white/80 font-semibold">Repartidor</TableHead>
            <TableHead className="text-white/80 font-semibold text-right">Total</TableHead>
            <TableHead className="text-white/80 font-semibold">Estado</TableHead>
            <TableHead className="text-white/80 font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className="border-gray-700 hover:bg-gray-800/30 transition-colors"
            >
              {/* ID Column */}
              <TableCell className="font-mono text-sm text-orange-400">
                #{order.id?.slice(-6).toUpperCase() || 'N/A'}
              </TableCell>

              {/* Cliente Column */}
              <TableCell>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-white font-medium">
                      {order.userName || 'Cliente'}
                    </div>
                    {order.userEmail && (
                      <div className="text-xs text-white/60">{order.userEmail}</div>
                    )}
                    {order.userPhone && (
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <Phone className="h-3 w-3" />
                        {order.userPhone}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Fecha Column */}
              <TableCell className="text-white/80 text-sm">
                {formatDate(order.createdAt)}
              </TableCell>

              {/* Dirección Column */}
              <TableCell>
                <div className="flex items-start gap-2 max-w-xs">
                  <MapPin className="h-4 w-4 text-white/40 mt-0.5 flex-shrink-0" />
                  <span className="text-white/70 text-sm line-clamp-2">
                    {formatAddress(order.shippingAddress)}
                  </span>
                </div>
              </TableCell>

              {/* Repartidor Column */}
              <TableCell>
                {order.driverName ? (
                  <div className="text-white/80 text-sm">
                    <div>{order.driverName}</div>
                    {order.driverPhone && (
                      <div className="text-xs text-white/60">{order.driverPhone}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-white/40 text-sm">Sin asignar</span>
                )}
              </TableCell>

              {/* Total Column */}
              <TableCell className="text-right">
                <span className="text-white font-semibold">
                  {formatCurrency(order.totalVerified)}
                </span>
              </TableCell>

              {/* Estado Column */}
              <TableCell>{getStatusBadge(order.status)}</TableCell>

              {/* Acciones Column */}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => order.id && onViewDetails(order.id)}
                  className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
