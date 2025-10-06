'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MoreHorizontal } from 'lucide-react';
import type { Order } from '@/lib/data';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';


const statusColors: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  'Pedido Realizado': 'secondary',
  'Preparando': 'default',
  'En Reparto': 'default',
  'Entregado': 'default',
};

const orderStatuses: Order['orderStatus'][] = ['Pedido Realizado', 'Preparando', 'En Reparto', 'Entregado'];

export default function AdminOrdersPage() {
  const firestore = useFirestore();

  const ordersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'orders') : null),
    [firestore]
  );
  const { data: orders, isLoading } = useCollection<Order>(ordersCollection);

  const handleStatusChange = (orderId: string, status: Order['orderStatus']) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    updateDocumentNonBlocking(orderRef, { orderStatus: status });
  };
  
  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    return 'Fecha no disponible';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos Recientes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Cargando pedidos...
                </TableCell>
              </TableRow>
            )}
            {orders && orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customerName || 'N/A'}</TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[order.orderStatus] || 'default'}>{order.orderStatus}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {orderStatuses.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => handleStatusChange(order.id, status)}
                          disabled={order.orderStatus === status}
                        >
                          Marcar como {status}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
    