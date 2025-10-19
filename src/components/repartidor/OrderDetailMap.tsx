'use client';

import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Navigation, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const libraries: ('places')[] = ['places'];

interface OrderDetailMapProps {
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    phone?: string;
    name?: string;
  } | string;
  driverLocation?: {
    lat: number;
    lng: number;
    timestamp?: any;
  } | null;
  showDriverMarker?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 20.6296,
  lng: -87.0739, // Playa del Carmen, Q.R.
};

export function OrderDetailMap({
  address,
  driverLocation,
  showDriverMarker = false,
}: OrderDetailMapProps) {
  const [center, setCenter] = useState(defaultCenter);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Geocode address to coordinates if not provided
  const geocodeAddress = useCallback(async (addressString: string) => {
    if (!addressString || addressString === 'whatsapp') return;

    setIsGeocoding(true);
    setError(null);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          addressString
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results[0]) {
        const location = data.results[0].geometry.location;
        const coords = { lat: location.lat, lng: location.lng };
        setCustomerLocation(coords);
        setCenter(coords);
      } else {
        setError('No se pudo obtener la ubicación del cliente');
      }
    } catch (err) {
      console.error('Error geocoding address:', err);
      setError('Error al obtener ubicación');
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Process address on mount or when it changes
  useEffect(() => {
    if (typeof address === 'object' && address.coordinates) {
      // Address already has coordinates
      const coords = { lat: address.coordinates.lat, lng: address.coordinates.lng };
      setCustomerLocation(coords);
      setCenter(coords);
    } else if (typeof address === 'string' && address !== 'whatsapp') {
      // Need to geocode string address
      geocodeAddress(address);
    } else if (typeof address === 'object') {
      // Build address string from components
      const addressString = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
      geocodeAddress(addressString);
    }
  }, [address, geocodeAddress]);

  // Update center when driver location changes (follow driver)
  useEffect(() => {
    if (driverLocation && showDriverMarker) {
      setCenter(driverLocation);
    }
  }, [driverLocation, showDriverMarker]);

  const openInGoogleMaps = () => {
    if (customerLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${customerLocation.lat},${customerLocation.lng}`;
      window.open(url, '_blank');
    }
  };

  const openInWaze = () => {
    if (customerLocation) {
      const url = `https://waze.com/ul?ll=${customerLocation.lat},${customerLocation.lng}&navigate=yes`;
      window.open(url, '_blank');
    }
  };

  if (loadError) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <p className="text-sm text-red-600">Error al cargar el mapa</p>
      </Card>
    );
  }

  if (!isLoaded || isGeocoding) {
    return (
      <Card className="p-8 flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Cargando mapa...</span>
      </Card>
    );
  }

  if (error || !customerLocation) {
    return (
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-5 h-5 text-yellow-600" />
          <p className="text-sm font-medium text-yellow-800">
            {error || 'Ubicación no disponible'}
          </p>
        </div>
        <p className="text-xs text-yellow-700 mb-3">
          Dirección: {typeof address === 'string' ? address : `${address.street}, ${address.city}`}
        </p>
        {customerLocation && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={openInGoogleMaps}
            >
              <Navigation className="w-4 h-4 mr-1" />
              Google Maps
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={openInWaze}
            >
              <Navigation className="w-4 h-4 mr-1" />
              Waze
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={showDriverMarker && driverLocation ? 15 : 16}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Customer Location Marker (Red) */}
        {customerLocation && (
          <Marker
            position={customerLocation}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new window.google.maps.Size(40, 40),
            }}
            title="Cliente"
          />
        )}

        {/* Driver Location Marker (Blue) - Only if showDriverMarker is true */}
        {showDriverMarker && driverLocation && (
          <Marker
            position={driverLocation}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new window.google.maps.Size(40, 40),
            }}
            title="Tu ubicación"
          />
        )}
      </GoogleMap>

      {/* Navigation Buttons */}
      <div className="p-3 bg-white border-t flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={openInGoogleMaps}
        >
          <Navigation className="w-4 h-4 mr-1" />
          Navegar en Maps
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={openInWaze}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Abrir en Waze
        </Button>
      </div>

      {/* Location Info */}
      <div className="p-3 bg-gray-50 border-t">
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Dirección del cliente:</p>
            <p className="mt-1">
              {typeof address === 'string'
                ? address
                : `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`}
            </p>
            {typeof address === 'object' && address.name && (
              <p className="mt-1 text-gray-700">
                <span className="font-medium">Contacto:</span> {address.name}
              </p>
            )}
            {typeof address === 'object' && address.phone && (
              <p className="mt-1">
                <span className="font-medium">Teléfono:</span>{' '}
                <a href={`tel:${address.phone}`} className="text-blue-600 hover:underline">
                  {address.phone}
                </a>
              </p>
            )}
          </div>
        </div>

        {driverLocation && showDriverMarker && (
          <div className="flex items-start gap-2 text-xs text-gray-600 mt-3 pt-3 border-t">
            <Navigation className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Tu ubicación actual:</p>
              <p className="mt-1">
                {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}
              </p>
              {driverLocation.timestamp && (
                <p className="mt-1 text-gray-500">
                  Actualizado:{' '}
                  {new Date(
                    driverLocation.timestamp.toDate
                      ? driverLocation.timestamp.toDate()
                      : driverLocation.timestamp
                  ).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
