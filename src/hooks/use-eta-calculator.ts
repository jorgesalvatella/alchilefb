import { useState, useEffect, useCallback } from 'react';

interface ETAResult {
  duration: string;
  distance: string;
  durationInMinutes: number;
}

interface UseETACalculatorProps {
  destinations: Array<{
    lat: number;
    lng: number;
  }>;
  enabled?: boolean;
}

export function useETACalculator({ destinations, enabled = true }: UseETACalculatorProps) {
  const [etas, setEtas] = useState<Map<string, ETAResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get current location
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(coords);
          resolve(coords);
        },
        (err) => {
          reject(new Error('No se pudo obtener ubicación'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  }, []);

  // Calculate ETA using Google Directions API
  const calculateETAs = useCallback(async () => {
    if (!enabled || destinations.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const origin = await getCurrentLocation();
      const newEtas = new Map<string, ETAResult>();

      // Calculate ETA for each destination
      for (const destination of destinations) {
        const key = `${destination.lat},${destination.lng}`;

        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?` +
            `origin=${origin.lat},${origin.lng}&` +
            `destination=${destination.lat},${destination.lng}&` +
            `mode=driving&` +
            `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );

          const data = await response.json();

          if (data.status === 'OK' && data.routes[0]) {
            const route = data.routes[0];
            const leg = route.legs[0];

            newEtas.set(key, {
              duration: leg.duration.text,
              distance: leg.distance.text,
              durationInMinutes: Math.round(leg.duration.value / 60),
            });
          } else {
            console.warn(`No se pudo calcular ETA para ${key}: ${data.status}`);
          }
        } catch (err) {
          console.error(`Error calculando ETA para ${key}:`, err);
        }
      }

      setEtas(newEtas);
    } catch (err: any) {
      setError(err.message);
      console.error('Error en useETACalculator:', err);
    } finally {
      setLoading(false);
    }
  }, [destinations, enabled, getCurrentLocation]);

  // Calculate on mount and when destinations change
  useEffect(() => {
    calculateETAs();
  }, [calculateETAs]);

  // Get ETA for a specific destination
  const getETA = useCallback((lat: number, lng: number): ETAResult | null => {
    const key = `${lat},${lng}`;
    return etas.get(key) || null;
  }, [etas]);

  return {
    etas,
    loading,
    error,
    currentLocation,
    refetch: calculateETAs,
    getETA,
  };
}
