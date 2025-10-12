'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DeliveryAddress {
  id?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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

  useEffect(() => {
    if (addressToEdit) {
      setStreetAddress(addressToEdit.streetAddress || '');
      setCity(addressToEdit.city || '');
      setState(addressToEdit.state || '');
      setZipCode(addressToEdit.zipCode || '');
    } else {
      setStreetAddress('');
      setCity('');
      setState('');
      setZipCode('');
    }
  }, [addressToEdit, isOpen]);

  const handleSave = () => {
    onSave({
      id: addressToEdit?.id,
      streetAddress,
      city,
      state,
      zipCode,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{addressToEdit ? 'Editar Dirección' : 'Añadir Nueva Dirección'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="street" className="text-right">Calle</Label>
            <Input id="street" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="city" className="text-right">Ciudad</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="state" className="text-right">Estado</Label>
            <Input id="state" value={state} onChange={(e) => setState(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="zip" className="text-right">C.P.</Label>
            <Input id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
