import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/firebase/provider';
import { Timestamp } from 'firebase/firestore';

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

interface ApiOrder {
  id: string;
  driverId: string;
  status: string;
  userId: string;
  items: any[];
  totalVerified: number;
  shippingAddress: any;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  [key: string]: any;
}

const AUTO_REFRESH_INTERVAL = 15000; // 15 segundos

export function useDriverOrders() {
  const { user } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/repartidores/me/pedidos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudieron cargar los pedidos');
      }

      const data = await response.json();

      // Convertir los pedidos de la API al formato esperado
      const ordersData: Order[] = (data.pedidos || []).map((order: ApiOrder) => ({
        ...order,
        createdAt: order.createdAt && order.createdAt._seconds
          ? new Timestamp(order.createdAt._seconds, order.createdAt._nanoseconds || 0)
          : null,
      }));

      setOrders(ordersData);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching driver orders:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [user]);

  // Fetch inicial y configurar auto-refresh
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setOrders([]);
      return;
    }

    // Fetch inicial
    setLoading(true);
    fetchOrders();

    // Configurar auto-refresh cada 15 segundos
    intervalRef.current = setInterval(() => {
      fetchOrders();
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup: limpiar interval al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, fetchOrders]);

  // Función para refetch manual (ej: cuando el usuario pulsa "Actualizar")
  const refetch = useCallback(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, refetch };
}
