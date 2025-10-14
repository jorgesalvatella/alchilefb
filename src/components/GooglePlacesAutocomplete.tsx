'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useJsApiLoader } from '@react-google-maps/api';

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

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Comienza a escribir tu dirección...',
  className,
  disabled = false,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      // Crear instancia de Autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: ['mx', 'cl'] }, // México y Chile
        fields: ['address_components', 'formatted_address', 'geometry'],
      });

      // Listener para cuando se selecciona un lugar
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();

        if (!place || !place.geometry || !place.geometry.location) {
          setError('No se pudo obtener la ubicación. Por favor, selecciona una dirección de la lista.');
          return;
        }

        setError(null);

        // Parsear los componentes de la dirección
        const addressComponents = place.address_components || [];
        const parsed: Partial<AddressComponents> = {
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
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

        // Callback con la dirección completa
        if (onAddressSelect) {
          onAddressSelect(parsed as AddressComponents);
        }

        // Actualizar el input con la dirección formateada
        onChange(place.formatted_address || '');
      });
    } catch (err) {
      console.error('Error initializing Google Places Autocomplete:', err);
      setError('Error al cargar el autocompletado de direcciones.');
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onAddressSelect, onChange]);

  if (loadError) {
    return (
      <div className="text-red-500 text-sm">
        Error al cargar Google Maps. Por favor, recarga la página.
      </div>
    );
  }

  if (!isLoaded) {
    return <Input placeholder="Cargando..." disabled className={className} />;
  }

  return (
    <div>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
