'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { MapPin, CheckCircle2, Mouse, Search, MapPinned, LocateFixed, Loader2 } from 'lucide-react';

const libraries: ('places')[] = ['places'];

interface AddressComponents {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface GooglePlacesAutocompleteWithMapProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function GooglePlacesAutocompleteWithMap({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Escribe tu dirección completa...',
  className,
  disabled = false,
}: GooglePlacesAutocompleteWithMapProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 20.6296, lng: -87.0739 // Playa del Carmen, Q.R.
  });
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Auto-centrar en la ubicación del usuario al cargar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Fallback a Playa del Carmen ya está en el estado inicial
          console.log("No se pudo obtener la ubicación, mostrando ubicación por defecto.");
        }
      );
    }
  }, []); // Se ejecuta solo una vez al montar el componente

  // Geocoding inverso: coordenadas -> dirección
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results[0]) {
        const place = data.results[0];
        const addressComponents = place.address_components || [];

        const parsed: Partial<AddressComponents> = {
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          lat,
          lng,
          formattedAddress: place.formatted_address || '',
        };

        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            parsed.street = component.long_name + ' ' + (parsed.street || '');
          }
          if (types.includes('route')) {
            parsed.street = (parsed.street || '') + component.long_name;
          }
          if (types.includes('sublocality') || types.includes('neighborhood')) {
            parsed.neighborhood = component.long_name;
          }
          if (types.includes('locality')) {
            parsed.city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            parsed.state = component.long_name;
          }
          if (types.includes('postal_code')) {
            parsed.postalCode = component.long_name;
          }
          if (types.includes('country')) {
            parsed.country = component.long_name;
          }
        });

        return parsed as AddressComponents;
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
    return null;
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError("La geolocalización no es soportada por tu navegador.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setSelectedLocation({ lat, lng });
        setMapCenter({ lat, lng });
        setIsAddressValid(true);
        setMode('manual');

        const address = await reverseGeocode(lat, lng);
        if (address) {
          onChange(address.formattedAddress);
          if (onAddressSelect) {
            onAddressSelect(address);
          }
        } else {
          const fallbackAddress = `Ubicación actual: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          onChange(fallbackAddress);
          if (onAddressSelect) {
            onAddressSelect({
              street: 'Ubicación actual',
              neighborhood: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
              lat,
              lng,
              formattedAddress: fallbackAddress,
            });
          }
        }
        setIsLocating(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Permiso de ubicación denegado. Actívalo en tu navegador.");
            break;
          case error.POSITION_UNAVAILABLE:
            setError("La información de ubicación no está disponible.");
            break;
          case error.TIMEOUT:
            setError("La solicitud de ubicación ha caducado.");
            break;
          default:
            setError("Ocurrió un error al obtener la ubicación.");
            break;
        }
        setIsLocating(false);
      }
    );
  };

  // Manejar click en el mapa (modo manual)
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (mode !== 'manual' || !e.latLng) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    setSelectedLocation({ lat, lng });
    setIsAddressValid(true);
    setError(null);

    // Intentar obtener dirección del punto clickeado
    const address = await reverseGeocode(lat, lng);
    if (address) {
      onChange(address.formattedAddress);
      if (onAddressSelect) {
        onAddressSelect(address);
      }
    } else {
      // Si no se puede obtener dirección, guardar con coordenadas
      const fallbackAddress = `Ubicación manual: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      onChange(fallbackAddress);
      if (onAddressSelect) {
        onAddressSelect({
          street: value || 'Dirección personalizada',
          neighborhood: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Chile',
          lat,
          lng,
          formattedAddress: fallbackAddress,
        });
      }
    }
  }, [mode, reverseGeocode, onChange, onAddressSelect, value]);

  // Configurar autocomplete (modo búsqueda)
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current || mode !== 'search') return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['mx', 'cl'] },
        fields: ['address_components', 'formatted_address', 'geometry'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (!place || !place.geometry || !place.geometry.location) {
          setError('Selecciona una dirección de las sugerencias');
          setIsAddressValid(false);
          setSelectedLocation(null);
          return;
        }

        setError(null);
        setIsAddressValid(true);

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setSelectedLocation({ lat, lng });
        setMapCenter({ lat, lng });

        const addressComponents = place.address_components || [];
        const parsed: Partial<AddressComponents> = {
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          lat,
          lng,
          formattedAddress: place.formatted_address || '',
        };

        addressComponents.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) {
            parsed.street = component.long_name + ' ' + (parsed.street || '');
          }
          if (types.includes('route')) {
            parsed.street = (parsed.street || '') + component.long_name;
          }
          if (types.includes('sublocality') || types.includes('neighborhood')) {
            parsed.neighborhood = component.long_name;
          }
          if (types.includes('locality')) {
            parsed.city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            parsed.state = component.long_name;
          }
          if (types.includes('postal_code')) {
            parsed.postalCode = component.long_name;
          }
          if (types.includes('country')) {
            parsed.country = component.long_name;
          }
        });

        if (onAddressSelect) {
          onAddressSelect(parsed as AddressComponents);
        }

        onChange(place.formatted_address || '');
      });
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setError('Error al cargar el autocompletado');
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, mode, onAddressSelect, onChange]);

  // Cambiar de modo
  const switchMode = (newMode: 'search' | 'manual') => {
    setMode(newMode);
    setError(null);
    if (newMode === 'manual') {
      setShowMap(true);
    }
  };

  if (loadError) {
    return (
      <div className="text-red-500 text-sm p-4 bg-red-50 rounded-lg">
        ⚠️ Error al cargar Google Maps. Por favor, recarga la página.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selector de modo */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={mode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchMode('search')}
          className="flex-1 min-w-[140px]"
        >
          <Search className="h-4 w-4 mr-2" />
          Buscar dirección
        </Button>
        <Button
          type="button"
          variant={mode === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchMode('manual')}
          className="flex-1 min-w-[140px]"
        >
          <Mouse className="h-4 w-4 mr-2" />
          Marcar en mapa
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="flex-1 min-w-[140px]"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4 mr-2" />
          )}
          {isLocating ? 'Ubicando...' : 'Mi ubicación'}
        </Button>
      </div>

      {/* Modo: Búsqueda */}
      {mode === 'search' && (
        <>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <MapPin className="h-5 w-5" />
            </div>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setIsAddressValid(false);
              }}
              placeholder={placeholder}
              className={`pl-10 pr-10 ${className}`}
              disabled={disabled}
            />
            {isAddressValid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
          </div>

          {!isAddressValid && !error && (
            <p className="text-sm text-gray-500">
              💡 Comienza a escribir y selecciona de las sugerencias
            </p>
          )}

          {error && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center gap-2 mb-2">
                <span>⚠️</span>
                {error}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => switchMode('manual')}
                className="w-full"
              >
                <MapPinned className="h-4 w-4 mr-2" />
                ¿No encuentras tu dirección? Márcala en el mapa
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modo: Manual */}
      {mode === 'manual' && (
        <>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
              <Mouse className="h-4 w-4" />
              Haz click en el mapa para marcar tu ubicación
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Mueve el mapa y haz click donde quieres recibir tu pedido
            </p>
          </div>

          {/* Mapa interactivo para modo manual */}
          <div className="rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg">
            <GoogleMap
              mapContainerStyle={{
                width: '100%',
                height: '400px',
              }}
              center={selectedLocation || mapCenter}
              zoom={selectedLocation ? 16 : 13}
              onClick={handleMapClick}
              options={{
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {selectedLocation && (
                <Marker
                  position={selectedLocation}
                  animation={google.maps.Animation.BOUNCE}
                />
              )}
            </GoogleMap>
          </div>

          {value && (
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Nombre de la dirección (opcional)
              </label>
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Ej: Mi casa, Trabajo, Casa de mamá..."
                className={className}
              />
            </div>
          )}
        </>
      )}

      {/* Confirmación visual */}
      {isAddressValid && selectedLocation && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">✓ Ubicación confirmada</span>
          </p>
          <p className="text-xs text-green-700 mt-1">{value}</p>
          <p className="text-xs text-green-600 mt-1">
            📍 Coordenadas: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Vista previa del mapa (modo búsqueda) */}
      {mode === 'search' && selectedLocation && (
        <div className="rounded-lg overflow-hidden border-2 border-green-500 shadow-lg">
          <GoogleMap
            mapContainerStyle={{
              width: '100%',
              height: '300px',
            }}
            center={selectedLocation}
            zoom={16}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            <Marker
              position={selectedLocation}
              animation={google.maps.Animation.DROP}
            />
          </GoogleMap>
          <div className="bg-green-500 text-white p-2 text-center text-sm font-medium">
            📍 Tu pedido será entregado aquí
          </div>
        </div>
      )}
    </div>
  );
}
