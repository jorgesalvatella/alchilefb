import { useEffect, useState, useCallback, useRef } from 'react';
import { useUser } from '@/firebase/provider';

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

const TRACKING_REFRESH_INTERVAL = 10000; // 10 segundos (más frecuente para tracking)

/**
 * Hook para obtener un pedido específico y sus actualizaciones,
 * incluyendo la ubicación del repartidor durante la entrega.
 *
 * @param orderId - ID del pedido a trackear
 * @param enabled - Si está habilitado el tracking (default: true)
 * @returns Datos del pedido y ubicación del repartidor
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
  const { user } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!user || !orderId) {
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();

      // Intentar obtener el pedido de la lista de pedidos del repartidor
      const response = await fetch('/api/repartidores/me/pedidos', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar el pedido');
      }

      const data = await response.json();

      // Buscar el pedido específico en la lista
      const foundOrder = (data.pedidos || []).find((p: any) => p.id === orderId);

      if (!foundOrder) {
        throw new Error('Pedido no encontrado o no asignado a ti');
      }

      setOrder(foundOrder);

      // Actualizar ubicación del repartidor si está disponible
      if (foundOrder.driverLocation) {
        setDriverLocation(foundOrder.driverLocation);
      } else {
        setDriverLocation(null);
      }

      setError(null);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Error al obtener datos del pedido');
      setLoading(false);
    }
  }, [user, orderId]);

  useEffect(() => {
    if (!enabled || !orderId || !user) {
      setLoading(false);
      return;
    }

    // Fetch inicial
    setLoading(true);
    fetchOrder();

    // Configurar auto-refresh para tracking en tiempo real
    // Más frecuente (10s) porque el tracking requiere actualizaciones más rápidas
    intervalRef.current = setInterval(() => {
      fetchOrder();
    }, TRACKING_REFRESH_INTERVAL);

    // Cleanup: limpiar interval al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [orderId, enabled, user, fetchOrder]);

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
