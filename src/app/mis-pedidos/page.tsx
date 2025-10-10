'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Order } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, CookingPot, Bike, Pizza, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusIcons: { [key: string]: React.ElementType } = {
  'Pedido Realizado': CheckCircle,
  'Preparando': CookingPot,
  'En Reparto': Bike,
  'Entregado': Pizza,
};

export default function OrdersPage() {
  const firestore = useFirestore();
  const { user, isUserLoading: authLoading } = useUser();

  const ordersQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'orders'), where('userId', '==', user.uid)) : null),
    [firestore, user]
  );
  const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

  const isLoading = authLoading || ordersLoading;

  const renderSkeleton = () => (
    <div className="relative min-h-screen overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-black"></div>
        <div className="relative z-10 container mx-auto px-6">
            <div className="text-center mb-16">
                <Skeleton className="h-16 w-3/4 mx-auto mb-4" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
            <div className="space-y-6 max-w-4xl mx-auto">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
            </div>
        </div>
    </div>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  if (!user) {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20 text-center">
            <div className="absolute inset-0 bg-black"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="relative z-10 container mx-auto px-6">
                <h1 className="text-5xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">Inicia Sesión para Ver tus Pedidos</h1>
                <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">Para poder ver tu historial de pedidos, primero necesitas iniciar sesión.</p>
                <Button size="lg" asChild className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105 transition-transform">
                    <Link href="/login">Iniciar Sesión</Link>
                </Button>
            </div>
        </div>
    );
  }

  if (orders && orders.length === 0) {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20 text-center">
            <div className="absolute inset-0 bg-black"></div>
            <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="relative z-10 container mx-auto px-6">
                <ShoppingBag className="mx-auto h-24 w-24 text-orange-400/80 mb-8 drop-shadow-lg" />
                <h1 className="text-5xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl">Aún no tienes pedidos</h1>
                <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">Parece que todavía no has hecho ningún pedido. ¡Anímate a probar nuestras delicias!</p>
                <Button size="lg" asChild className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105 transition-transform">
                    <Link href="/menu">Ver el Menú</Link>
                </Button>
            </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-black"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 container mx-auto px-6">
            <div className="text-center mb-16 fade-in-up">
                <h1 className="text-6xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl">
                    <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">Mis Pedidos</span>
                </h1>
                <p className="text-xl text-white/80 max-w-2xl mx-auto">
                    Aquí puedes ver el historial de todos tus pedidos y rastrear los que están en curso.
                </p>
            </div>

            <div className="space-y-6 max-w-4xl mx-auto">
                {orders?.map((order, index) => {
                    const Icon = statusIcons[order.orderStatus] || ShoppingBag;
                    return (
                        <Link key={order.id} href={`/orders/${order.id}`} className="block fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
                            <div className="group relative bg-black/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-chile-red/30 hover:scale-105 border-2 border-white/10 hover:border-chile-red/50">
                                <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-chile-red/20 rounded-2xl flex items-center justify-center">
                                            <Icon className="w-8 h-8 text-chile-red" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white">Pedido #{order.id.substring(0, 7)}</h3>
                                            <p className="text-white/60 text-sm">
                                                {order.orderDate?.toDate().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-300 bg-clip-text text-transparent">${order.totalAmount.toFixed(2)}</p>
                                        <p className={cn(
                                            'font-bold text-sm',
                                            order.orderStatus === 'Entregado' && 'text-green-400',
                                            order.orderStatus === 'En Reparto' && 'text-blue-400',
                                            order.orderStatus === 'Preparando' && 'text-orange-400',
                                            order.orderStatus === 'Pedido Realizado' && 'text-gray-400',
                                        )}>{order.orderStatus}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    </div>
  );
}