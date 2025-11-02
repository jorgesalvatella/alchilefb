import { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

interface Order {
  id: string;
  driverId: string;
  status: string;
  userId: string;
  items: any[];
  totalVerified: number;
  shippingAddress: any;
  createdAt: Timestamp;
  [key: string]: any;
}

export function useDriverOrders() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Establecer subscripción en tiempo real
  useEffect(() => {
    if (!user || !firestore) {
      setLoading(false);
      setOrders([]);
      return;
    }

    // Consultar pedidos del repartidor actual
    const ordersRef = collection(firestore, 'pedidos');
    const q = query(
      ordersRef,
      where('driverId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Establecer subscripción en tiempo real
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ordersData: Order[] = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({ ...doc.data(), id: doc.id } as Order);
        });
        setOrders(ordersData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching driver orders:', err);
        setError(err.message);
        setOrders([]);
        setLoading(false);
      }
    );

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => unsubscribe();
  }, [user, firestore]);

  // Función para refetch manual (realmente ya no es necesaria con tiempo real, pero la mantenemos por compatibilidad)
  const refetch = useCallback(() => {
    // Con onSnapshot, los datos ya están actualizados en tiempo real
    // Esta función ahora es un no-op pero la mantenemos para no romper el código existente
    console.log('[useDriverOrders] Refetch called - data is already real-time');
  }, []);

  return { orders, loading, error, refetch };
}
