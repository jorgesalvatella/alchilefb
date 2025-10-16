'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Order, OrderStatus, StatusHistoryEntry } from '@/lib/types';
import {
  Package,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  DollarSign,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  ChefHat,
  ShoppingBag,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AssignDriverDialog } from './AssignDriverDialog';

interface OrderDetailsSheetProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onActionSuccess: () => void;
}

export function OrderDetailsSheet({
  order,
  isOpen,
  onClose,
  onStatusChange,
  onCancelOrder,
  onActionSuccess,
}: OrderDetailsSheetProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  if (!order) return null;

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'Pedido Realizado':
        return ShoppingBag;
      case 'Preparando':
        return ChefHat;
      case 'En Reparto':
        return Truck;
      case 'Entregado':
        return CheckCircle2;
      case 'Cancelado':
        return XCircle;
      default:
        return Package;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pedido Realizado':
        return 'text-yellow-400';
      case 'Preparando':
        return 'text-orange-400';
      case 'En Reparto':
        return 'text-blue-400';
      case 'Entregado':
        return 'text-green-400';
      case 'Cancelado':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  const formatAddress = (shippingAddress: any) => {
    if (typeof shippingAddress === 'string') {
      if (shippingAddress === 'whatsapp') {
        return 'Coordinación por WhatsApp';
      }
      if (shippingAddress.startsWith('http')) {
        return 'Ubicación GPS (ver en mapa)';
      }
      return shippingAddress;
    }

    if (shippingAddress && typeof shippingAddress === 'object') {
      return `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`;
    }

    return 'No especificada';
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order.id || newStatus === order.status) return;

    setIsUpdatingStatus(true);
    try {
      await onStatusChange(order.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order.id || !cancelReason.trim()) return;

    setIsCancelling(true);
    try {
      await onCancelOrder(order.id, cancelReason);
      setShowCancelDialog(false);
      setCancelReason('');
    } finally {
      setIsCancelling(false);
    }
  };

  const canChangeStatus = order.status !== 'Entregado' && order.status !== 'Cancelado';
  const canCancel = order.status !== 'Entregado' && order.status !== 'Cancelado';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl bg-gray-900 border-gray-700 text-white overflow-y-auto">
          <SheetHeader data-testid="order-details-header">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-bold text-white">
                Pedido #{order.id?.slice(-6).toUpperCase()}
              </SheetTitle>
              {getStatusBadge(order.status)}
            </div>
            <SheetDescription className="text-white/60">
              Detalles completos del pedido
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Status Management Section */}
            {canChangeStatus && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <label className="text-sm font-medium text-white/80 mb-2 block">
                  Cambiar Estado del Pedido
                </label>
                <Select
                  value={order.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="Pedido Realizado" className="text-white focus:bg-gray-800">
                      Pedido Realizado
                    </SelectItem>
                    <SelectItem value="Preparando" className="text-white focus:bg-gray-800">
                      Preparando
                    </SelectItem>
                    <SelectItem value="En Reparto" className="text-white focus:bg-gray-800">
                      En Reparto
                    </SelectItem>
                    <SelectItem value="Entregado" className="text-white focus:bg-gray-800">
                      Entregado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Historial de Estados
                </h3>
                <div className="space-y-3">
                  {order.statusHistory.map((entry: StatusHistoryEntry, index: number) => {
                    const Icon = getStatusIcon(entry.status);
                    const isLast = index === order.statusHistory!.length - 1;

                    return (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            ${isLast ? 'bg-orange-500/20' : 'bg-gray-700/50'}
                          `}
                          >
                            <Icon
                              className={`h-4 w-4 ${
                                isLast ? getStatusColor(entry.status) : 'text-gray-500'
                              }`}
                            />
                          </div>
                          {index < order.statusHistory!.length - 1 && (
                            <div className="w-0.5 h-6 bg-gray-700" />
                          )}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="text-sm font-medium text-white">
                            {entry.status}
                          </div>
                          <div className="text-xs text-white/60">
                            {formatDate(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white/80 mb-3">
                Información del Cliente
              </h3>
              <div className="space-y-2">
                {order.userName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-white/40" />
                    <span className="text-white/80">{order.userName}</span>
                  </div>
                )}
                {order.userEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-white/40" />
                    <span className="text-white/80">{order.userEmail}</span>
                  </div>
                )}
                {order.userPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-white/40" />
                    <span className="text-white/80">{order.userPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección de Entrega
              </h3>
              <p className="text-sm text-white/80">{formatAddress(order.shippingAddress)}</p>
            </div>

            {/* Driver Information */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Repartidor
              </h3>
              {order.driverName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-white/40" />
                    <span className="text-white/80">{order.driverName}</span>
                  </div>
                  {order.driverPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-white/40" />
                      <span className="text-white/80">{order.driverPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-white/60 mb-3">No hay repartidor asignado.</p>
                  <Button 
                    size="sm" 
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={() => setIsAssignDialogOpen(true)}
                    disabled={order.status !== 'Pedido Realizado' && order.status !== 'Preparando'}
                  >
                    Asignar Repartidor
                  </Button>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Artículos del Pedido
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {item.quantity}x {item.name}
                      </div>
                      {item.customizations && (
                        <div className="text-xs text-white/60 mt-1">
                          {item.customizations.added?.length > 0 && (
                            <div>
                              + {item.customizations.added.map((a) => a.nombre).join(', ')}
                            </div>
                          )}
                          {item.customizations.removed?.length > 0 && (
                            <div>
                              - {item.customizations.removed.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-white">
                      {formatCurrency(item.subtotalItem || (item.price * item.quantity) || 0)}
                    </div>
                  </div>
                ))}
                <Separator className="bg-gray-700" />
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/80">Subtotal</span>
                    <span className="text-white/80">{formatCurrency(order.subtotalVerified || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/80">IVA (Impuestos)</span>
                    <span className="text-white/80">{formatCurrency(order.taxVerified || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-orange-400">{formatCurrency(order.totalVerified || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Método de Pago
              </h3>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-white/40" />
                <span className="text-sm text-white/80">{order.paymentMethod}</span>
              </div>
            </div>

            {/* Cancellation Info */}
            {order.status === 'Cancelado' && order.cancelReason && (
              <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pedido Cancelado
                </h3>
                <p className="text-sm text-white/80">{order.cancelReason}</p>
                {order.cancelledAt && (
                  <p className="text-xs text-white/60 mt-2">
                    Cancelado el {formatDate(order.cancelledAt)}
                  </p>
                )}
              </div>
            )}

            {/* Cancel Order Button */}
            {canCancel && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Pedido
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Order Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Cancelar este pedido?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción no se puede deshacer. Por favor, indica el motivo de la cancelación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo de cancelación..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-white/40 min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-gray-800 text-white hover:bg-gray-700"
              disabled={isCancelling}
            >
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={!cancelReason.trim() || isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssignDriverDialog 
        isOpen={isAssignDialogOpen} 
        onClose={() => setIsAssignDialogOpen(false)} 
        order={order} 
        onSuccess={onActionSuccess}
      />
    </>
  );
}