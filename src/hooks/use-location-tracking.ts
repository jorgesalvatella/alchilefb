import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/firebase/provider';

interface LocationTrackingOptions {
  orderId?: string;
  enabled: boolean;
  interval?: number; // En milisegundos, default 10000 (10 segundos)
}

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export function useLocationTracking({ orderId, enabled, interval = 10000 }: LocationTrackingOptions) {
  const { user } = useUser();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const sendLocationToServer = async (location: LocationData) => {
    if (!user || !orderId) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/repartidores/me/update-location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...location,
          orderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar ubicación');
      }

      setLastLocation(location);
      setError(null);
    } catch (err: any) {
      console.error('Error sending location:', err);
      setError(err.message);
    }
  };

  const handlePositionUpdate = (position: GeolocationPosition) => {
    const location: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
    };

    // Solo enviar si la precisión es aceptable (< 100m)
    if (!location.accuracy || location.accuracy < 100) {
      sendLocationToServer(location);
    } else {
      console.warn('Ubicación rechazada por baja precisión:', location.accuracy);
    }
  };

  const handlePositionError = (error: GeolocationPositionError) => {
    let errorMessage = 'Error desconocido al obtener ubicación';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Permiso de ubicación denegado. Por favor habilita el GPS.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Ubicación no disponible. Verifica tu conexión.';
        break;
      case error.TIMEOUT:
        // No mostrar error por timeout - es común en entornos de desarrollo
        console.warn('Timeout al obtener ubicación (normal en desarrollo)');
        return; // No setear error para timeout
    }

    setError(errorMessage);
    console.error('Geolocation error:', error);
  };

  useEffect(() => {
    if (!enabled || !orderId || !user) {
      // Limpiar tracking si está deshabilitado
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsTracking(false);
      return;
    }

    // Verificar si el navegador soporta geolocalización
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en este navegador');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Configuración de geolocalización
    const options: PositionOptions = {
      enableHighAccuracy: false, // Ahorrar batería (suficiente para delivery)
      timeout: 30000, // 30 segundos (más tiempo para entornos lentos)
      maximumAge: 10000, // Usar caché de hasta 10 segundos
    };

    // Obtener ubicación inicial inmediatamente
    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );

    // Configurar actualizaciones periódicas usando watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );

    // Backup: enviar ubicación cada X segundos aunque watchPosition no se dispare
    intervalIdRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePositionUpdate,
        handlePositionError,
        options
      );
    }, interval);

    // Cleanup al desmontar o cambiar dependencias
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, orderId, user, interval]);

  return {
    isTracking,
    error,
    lastLocation,
  };
}
