import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchDriverIdAndSubscribe = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/repartidores/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener información del repartidor');
        }

        const driver = await response.json();

        // Suscribirse a los pedidos en tiempo real
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('driverId', '==', driver.id),
          where('status', 'in', ['Preparando', 'En Reparto']),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const ordersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Order[];

          setOrders(ordersData);
          setLoading(false);
        }, (err) => {
          setError(err.message);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    const unsubscribePromise = fetchDriverIdAndSubscribe();

    return () => {
      unsubscribePromise.then(unsub => unsub?.());
    };
  }, [user]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
  };

  return { orders, loading, error, refetch };
}
