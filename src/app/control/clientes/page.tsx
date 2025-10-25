'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import type { Order, UserProfile, Address } from '@/lib/data';
import { useEffect, useState } from 'react';
import { withAuth } from '@/firebase/withAuth';

function AdminCustomersPage() {
  const firestore = useFirestore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ordersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'pedidos') : null),
    [firestore]
  );
  const { data: orders, isLoading: isLoadingOrders } = useCollection<Order>(ordersCollection);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (orders && firestore) {
        const userIds = [...new Set(orders.map(order => order.userId))];
        const customerData = await Promise.all(
          userIds.map(async (userId) => {
            const userRef = doc(firestore, 'users', userId);
            const userSnap = await getDoc(userRef);
            const userProfile = userSnap.data() as UserProfile;

            const addressesRef = collection(firestore, `users/${userId}/delivery_addresses`);
            const addressesSnap = await getDocs(addressesRef);
            const addresses = addressesSnap.docs.map(doc => doc.data()) as Address[];

            const orderCount = orders.filter(order => order.userId === userId).length;
            return { ...userProfile, id: userId, orderCount, addresses };
          })
        );
        setCustomers(customerData);
        setIsLoading(false);
      }
    };

    if (!isLoadingOrders) {
        fetchCustomers();
    }
  }, [orders, firestore, isLoadingOrders]);

  return (
    <div className="pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Clientes
                </span>
            </h1>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">Nombre</TableHead>
                <TableHead className="text-white/80">Email</TableHead>
                <TableHead className="text-white/80">Teléfono</TableHead>
                <TableHead className="text-white/80">Dirección Principal</TableHead>
                <TableHead className="text-white/80">Pedidos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="text-center text-white/60 py-12">
                    Cargando clientes...
                  </TableCell>
                </TableRow>
              )}
              {customers.map((customer) => (
                <TableRow key={customer.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{customer.firstName} {customer.lastName}</TableCell>
                  <TableCell className="text-white/80">{customer.email}</TableCell>
                  <TableCell className="text-white/80">{customer.phone}</TableCell>
                  <TableCell className="text-white/80">
                    {customer.addresses && customer.addresses.length > 0 ? (
                        <>{customer.addresses[0].street}, {customer.addresses[0].city}</>
                    ) : (
                        'No disponible'
                    )}
                    </TableCell>
                  <TableCell className="text-white/80">{customer.orderCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}

export default withAuth(AdminCustomersPage, 'admin');
