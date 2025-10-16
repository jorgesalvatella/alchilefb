'use client';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { Order, MenuItem } from '@/lib/data';
import { withAuth } from '@/firebase/withAuth';

function AdminDashboardPage() {
    const firestore = useFirestore();

    const ordersCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'orders') : null),
        [firestore]
    );
    const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersCollection);

    const menuItemsCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'menu_items') : null),
        [firestore]
    );
    const { data: menuItems, isLoading: isLoadingMenuItems } = useCollection<MenuItem>(menuItemsCollection);

    const totalRevenue = orders?.reduce((acc, order) => acc + order.totalAmount, 0) || 0;
    const newOrders = orders?.length || 0;
    const newCustomers = orders?.map(order => order.userId).filter((value, index, self) => self.indexOf(value) === index).length || 0;
    const productsInStock = menuItems?.length || 0;

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:bg-white/10 hover:scale-105">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-headline text-white/80">Ingresos Totales</h3>
                    <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-4xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
            </div>
        </div>
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:bg-white/10 hover:scale-105">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-headline text-white/80">Nuevos Pedidos</h3>
                    <ShoppingCart className="h-6 w-6 text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white">+{newOrders}</p>
            </div>
        </div>
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:bg-white/10 hover:scale-105">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-headline text-white/80">Nuevos Clientes</h3>
                    <Users className="h-6 w-6 text-purple-400" />
                </div>
                <p className="text-4xl font-bold text-white">+{newCustomers}</p>
            </div>
        </div>
        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:bg-white/10 hover:scale-105">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-headline text-white/80">Productos en Stock</h3>
                    <Package className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-4xl font-bold text-white">{productsInStock}</p>
            </div>
        </div>
    </div>
  );
}

export default withAuth(AdminDashboardPage, 'admin');
