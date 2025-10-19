'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';
import { useLocationTracking } from '@/hooks/use-location-tracking';
import { Loader2, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

interface DeliveryActionsProps {
  order: {
    id: string;
    status: string;
    driverId?: string;
  };
}

export function DeliveryActions({ order }: DeliveryActionsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();

  // Activar tracking solo si el pedido está "En Reparto"
  const { isTracking, error: trackingError, lastLocation } = useLocationTracking({
    orderId: order.id,
    enabled: order.status === 'En Reparto',
    interval: 10000, // 10 segundos
  });

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5000,
      });
    });
  };

  const handleStartDelivery = async () => {
    setLoading(true);
    try {
      let currentLocation = null;

      // Intentar obtener ubicación actual
      try {
        const position = await getCurrentPosition();
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        };
      } catch (geoError) {
        console.warn('No se pudo obtener ubicación:', geoError);
        toast({
          title: '⚠️ Sin GPS',
          description: 'No se pudo obtener tu ubicación, pero puedes continuar.',
          variant: 'default',
        });
      }

      const token = await user?.getIdToken();
      const response = await fetch(`/api/pedidos/${order.id}/marcar-en-camino`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentLocation }),
      });

      if (response.ok) {
        toast({
          title: '✅ En Camino',
          description: 'Pedido marcado como En Reparto. Tracking activado.',
        });
        // El componente se actualizará automáticamente por la suscripción de Firestore
      } else {
        const error = await response.json();
        toast({
          title: 'Error al actualizar',
          description: error.message || 'Inténtalo de nuevo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error al actualizar',
        description: 'Verifica tu conexión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/pedidos/${order.id}/marcar-entregado`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          deliveryNotes: 'Entregado correctamente',
        }),
      });

      if (response.ok) {
        toast({
          title: '🎉 Pedido Entregado',
          description: 'Has completado la entrega exitosamente.',
        });
        router.push('/repartidor/dashboard');
      } else {
        const error = await response.json();
        toast({
          title: 'Error al completar',
          description: error.message || 'Inténtalo de nuevo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error al completar',
        description: 'Verifica tu conexión',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mostrar estado de tracking si está activo
  if (order.status === 'En Reparto') {
    return (
      <div className="space-y-4">
        {/* Indicador de Tracking */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            {isTracking ? (
              <>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-800">
                  Tracking Activo
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  Tracking Inactivo
                </span>
              </>
            )}
          </div>

          {trackingError && (
            <p className="text-xs text-red-600 mb-2">{trackingError}</p>
          )}

          {lastLocation && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              <span>
                Última ubicación: {lastLocation.lat.toFixed(5)}, {lastLocation.lng.toFixed(5)}
                {lastLocation.accuracy && ` (±${Math.round(lastLocation.accuracy)}m)`}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-600 mt-2">
            Tu ubicación se comparte automáticamente con el cliente cada 10 segundos
          </p>
        </div>

        {/* Botón para marcar como entregado */}
        <Button
          onClick={handleCompleteDelivery}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Marcar como Entregado
            </>
          )}
        </Button>
      </div>
    );
  }

  // Botón para iniciar la entrega
  if (order.status === 'Preparando') {
    return (
      <Button
        onClick={handleStartDelivery}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-lg"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5 mr-2" />
            Salir a Entregar
          </>
        )}
      </Button>
    );
  }

  // Pedido ya entregado
  return (
    <div className="text-center p-4 bg-gray-50 rounded-lg">
      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
      <p className="text-gray-600">Pedido ya entregado</p>
    </div>
  );
}
