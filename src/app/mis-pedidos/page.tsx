'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, CookingPot, Bike, Pizza, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const statusIcons: { [key: string]: React.ElementType } = {
  'Pedido Realizado': CheckCircle,
  'Preparando': CookingPot,
  'En Reparto': Bike,
  'Entregado': Pizza,
};

// Función de utilidad para convertir Timestamps de Firestore de forma segura
function safeTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'object' && '_seconds' in timestamp) {
    return new Date(timestamp._seconds * 1000);
  }
  try {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Ignorar errores
  }
  return null;
}

function OrdersPage({ user }: WithAuthProps) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    // Establecer subscripción en tiempo real a los pedidos del usuario
    const ordersRef = collection(firestore, 'pedidos');
    const q = query(
      ordersRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ordersData: Order[] = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({ ...doc.data(), id: doc.id } as Order);
        });
        setOrders(ordersData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error al suscribirse a los pedidos:', error);
        setOrders([]);
        setIsLoading(false);
      }
    );

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => unsubscribe();
  }, [user, firestore]);

  const renderSkeleton = () => (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        <div className="text-center mb-12">
            <Skeleton className="h-16 w-3/4 mx-auto mb-4 bg-gray-700" />
            <Skeleton className="h-6 w-1/2 mx-auto bg-gray-600" />
        </div>
        <div className="space-y-6 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl bg-gray-700" />
            ))}
        </div>
    </main>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  if (orders && orders.length === 0) {
    return (
        <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32 text-center">
            <ShoppingBag className="mx-auto h-24 w-24 text-orange-400 mb-8" />
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-white mb-6">Aún no tienes pedidos</h1>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-white/70 mb-8">Parece que todavía no has hecho ningún pedido. ¡Anímate a probar nuestras delicias!</p>
            <Button size="lg" asChild className="bg-orange-500 text-white hover:bg-orange-600 font-bold">
                <Link href="/menu">Ver el Menú</Link>
            </Button>
        </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">Mis Pedidos</span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Aquí puedes ver el historial de todos tus pedidos y rastrear los que están en curso.
            </p>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
            {orders?.map((order) => {
                const Icon = statusIcons[order.status] || ShoppingBag;
                const orderDate = safeTimestampToDate(order.createdAt);
                return (
                    <Link key={order.id} href={`/mis-pedidos/${order.id}`} className="block">
                        <Card className="bg-gray-900/50 border-gray-700 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-orange-500/50">
                            <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                                        <Icon className="w-8 h-8 text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Pedido #{order.id.substring(0, 7)}</h3>
                                        <p className="text-white/60 text-sm">
                                            {orderDate
                                                ? orderDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                                                : 'Fecha no disponible'
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-orange-400">${order.totalVerified.toFixed(2)}</p>
                                    <p className={cn(
                                        'font-bold text-sm',
                                        order.status === 'Entregado' && 'text-fresh-green',
                                        order.status === 'En Reparto' && 'text-blue-400',
                                        order.status === 'Preparando' && 'text-orange-400',
                                        order.status === 'Pedido Realizado' && 'text-white/70',
                                    )}>{order.status}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )
            })}
        </div>
    </main>
  );
}

export default withAuth(OrdersPage, 'user');