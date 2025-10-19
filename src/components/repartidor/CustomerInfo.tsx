'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Phone, MapPin } from 'lucide-react';

interface CustomerInfoProps {
  customer: {
    name?: string;
    street: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export function CustomerInfo({ customer }: CustomerInfoProps) {
  const handleCall = () => {
    if (customer.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const handleOpenMaps = () => {
    if (customer.coordinates) {
      // Abrir en Google Maps (funciona en móviles con la app instalada)
      const url = `https://www.google.com/maps/dir/?api=1&destination=${customer.coordinates.lat},${customer.coordinates.lng}`;
      window.open(url, '_blank');
    } else {
      // Fallback: buscar por dirección
      const address = encodeURIComponent(
        `${customer.street}, ${customer.city || ''}, ${customer.state || ''}`
      );
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Información del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold text-lg">
            {customer.name || 'Cliente'}
          </p>
        </div>

        {customer.phone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">{customer.phone}</span>
            </div>
            <Button
              onClick={handleCall}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              Llamar
            </Button>
          </div>
        )}

        <div>
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-1" />
            <div className="flex-1">
              <p className="font-medium">Dirección de Entrega</p>
              <p className="text-gray-700">{customer.street}</p>
              {customer.city && (
                <p className="text-sm text-gray-600">
                  {customer.city}
                  {customer.state && `, ${customer.state}`}
                  {customer.postalCode && ` ${customer.postalCode}`}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleOpenMaps}
            variant="default"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            🗺️ Abrir en Maps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
