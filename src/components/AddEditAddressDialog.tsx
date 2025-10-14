'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GooglePlacesAutocompleteWithMap from '@/components/GooglePlacesAutocompleteWithMap';

interface DeliveryAddress {
  id?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
}

interface AddEditAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: DeliveryAddress) => void;
  addressToEdit?: DeliveryAddress | null;
}

export default function AddEditAddressDialog({ isOpen, onClose, onSave, addressToEdit }: AddEditAddressDialogProps) {
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [formattedAddress, setFormattedAddress] = useState('');

  useEffect(() => {
    if (addressToEdit) {
      setStreetAddress(addressToEdit.streetAddress || '');
      setCity(addressToEdit.city || '');
      setState(addressToEdit.state || '');
      setZipCode(addressToEdit.zipCode || '');
      setLat(addressToEdit.lat);
      setLng(addressToEdit.lng);
      setFormattedAddress(addressToEdit.formattedAddress || '');
    } else {
      setStreetAddress('');
      setCity('');
      setState('');
      setZipCode('');
      setLat(undefined);
      setLng(undefined);
      setFormattedAddress('');
    }
  }, [addressToEdit, isOpen]);

  const handleSave = () => {
    onSave({
      id: addressToEdit?.id,
      streetAddress,
      city,
      state,
      zipCode,
      lat,
      lng,
      formattedAddress,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {addressToEdit ? '✏️ Editar Dirección' : '📍 Añadir Nueva Dirección'}
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Busca tu dirección en el mapa para asegurar entregas precisas
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campo principal con mapa */}
          <div>
            <Label htmlFor="street" className="text-base font-semibold mb-2 block">
              Dirección Completa
            </Label>
            <GooglePlacesAutocompleteWithMap
              value={streetAddress}
              onChange={setStreetAddress}
              onAddressSelect={(address) => {
                setStreetAddress(address.street);
                setCity(address.city);
                setState(address.state);
                setZipCode(address.postalCode);
                setLat(address.lat);
                setLng(address.lng);
                setFormattedAddress(address.formattedAddress);
              }}
              placeholder="Ej: Av. Providencia 1234, Providencia, Santiago..."
            />
          </div>

          {/* Campos opcionales (solo si se llenó la dirección principal) */}
          {lat && lng && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Detalles adicionales (opcional)
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-sm">Ciudad</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-1"
                      placeholder="Auto-completado"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm">Estado/Región</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="mt-1"
                      placeholder="Auto-completado"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <Label htmlFor="zip" className="text-sm">Código Postal</Label>
                  <Input
                    id="zip"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="mt-1"
                    placeholder="Auto-completado"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!lat || !lng}
            className="bg-green-600 hover:bg-green-700"
          >
            {lat && lng ? '✓ Guardar Dirección' : 'Selecciona una dirección primero'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
