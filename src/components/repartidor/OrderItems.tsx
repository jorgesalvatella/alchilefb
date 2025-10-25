'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, DollarSign, CreditCard } from 'lucide-react';

interface OrderItemsProps {
  items: Array<{
    name: string;
    quantity: number;
    price?: number; // Opcional, puede no existir
    subtotalItem?: number; // Precio total del item (price * quantity)
    totalItem?: number; // Total con impuestos
  }>;
  total: number;
  paymentMethod: string;
}

export function OrderItems({ items, total, paymentMethod }: OrderItemsProps) {
  // Calcular el precio de un item (unitario o total)
  const getItemPrice = (item: any) => {
    // Si tiene subtotalItem (estructura del backend), usarlo
    if (item.subtotalItem !== undefined) {
      return item.subtotalItem;
    }
    // Si tiene price y quantity, calcular
    if (item.price !== undefined && item.quantity) {
      return item.price * item.quantity;
    }
    // Fallback a 0
    return 0;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
    };
    return methods[method] || method;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'transfer':
        return '🏦';
      default:
        return '💰';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Productos del Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-start py-2 border-b last:border-0">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-600">
                  Cantidad: {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-gray-700">
                ${getItemPrice(item).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t-2 space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-lg font-semibold">Total</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              ${(total || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-3 rounded">
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">Método de pago:</span>
            <span className="ml-auto font-semibold">
              {getPaymentIcon(paymentMethod)} {getPaymentMethodLabel(paymentMethod)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
