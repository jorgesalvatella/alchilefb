import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: any;
}

interface Order {
  id: string;
  status: string;
  driverLocation?: DriverLocation;
  driverId?: string;
  driverName?: string;
  [key: string]: any;
}

interface UseOrderTrackingOptions {
  orderId: string;
  enabled?: boolean;
}

interface UseOrderTrackingReturn {
  order: Order | null;
  driverLocation: DriverLocation | null;
  isTracking: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para suscribirse a las actualizaciones de un pedido en tiempo real,
 * incluyendo la ubicación del repartidor durante la entrega.
 *
 * @param orderId - ID del pedido a trackear
 * @param enabled - Si está habilitado el tracking (default: true)
 * @returns Datos del pedido y ubicación del repartidor en tiempo real
 *
 * @example
 * ```tsx
 * const { order, driverLocation, isTracking } = useOrderTracking({
 *   orderId: '123abc',
 *   enabled: true
 * });
 *
 * if (isTracking && driverLocation) {
 *   return <Map driverPosition={driverLocation} />;
 * }
 * ```
 */
export function useOrderTracking({
  orderId,
  enabled = true,
}: UseOrderTrackingOptions): UseOrderTrackingReturn {
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Suscribirse al documento del pedido en tiempo real
    const orderRef = doc(db, 'orders', orderId);

    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const orderData = { id: snapshot.id, ...snapshot.data() } as Order;
          setOrder(orderData);

          // Actualizar ubicación del repartidor si está disponible
          if (orderData.driverLocation) {
            setDriverLocation(orderData.driverLocation);
          } else {
            setDriverLocation(null);
          }

          setError(null);
        } else {
          setError('Pedido no encontrado');
          setOrder(null);
          setDriverLocation(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error al suscribirse al pedido:', err);
        setError(err.message || 'Error al obtener datos del pedido');
        setLoading(false);
      }
    );

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      unsubscribe();
    };
  }, [orderId, enabled]);

  // Determinar si el tracking está activo
  const isTracking = order?.status === 'En Reparto' && !!driverLocation;

  return {
    order,
    driverLocation,
    isTracking,
    loading,
    error,
  };
}
