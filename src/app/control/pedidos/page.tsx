'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { Order } from '@/lib/data';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export default function AdminOrdersPage() {
  const firestore = useFirestore();

  const ordersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'orders') : null),
    [firestore]
  );
  const { data: orders, isLoading } = useCollection<Order>(ordersCollection);

  return (
    <div className="pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Pedidos
                </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Gestiona y monitorea todos los pedidos del sistema.
            </p>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">ID del Pedido</TableHead>
                <TableHead className="text-white/80">Fecha</TableHead>
                <TableHead className="text-white/80">Estado</TableHead>
                <TableHead className="text-white/80">Total</TableHead>
                <TableHead className="text-right text-white/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="text-center text-white/60 py-12">
                    Cargando pedidos...
                  </TableCell>
                </TableRow>
              )}
              {orders && orders.map((order) => (
                <TableRow key={order.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{order.id}</TableCell>
                  <TableCell className="text-white/80">{order.orderDate.toDate().toLocaleDateString()}</TableCell>
                  <TableCell className="text-white/80">{order.orderStatus}</TableCell>
                  <TableCell className="text-white/80">${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" className="text-white/60 hover:text-orange-400">
                        <Link href={`/orders/${order.id}`}>
                            <Eye className="h-4 w-4" />
                        </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
