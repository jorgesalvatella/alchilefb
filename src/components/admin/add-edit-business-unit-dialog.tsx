'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { BusinessUnit } from '@/lib/data';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { FileUploader } from './file-uploader';


interface AddEditBusinessUnitDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  businessUnit: BusinessUnit | null;
}

export function AddEditBusinessUnitDialog({
  isOpen,
  onOpenChange,
  businessUnit,
}: AddEditBusinessUnitDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxIdUrl, setTaxIdUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (businessUnit) {
        setName(businessUnit.name);
        setAddress(businessUnit.address || '');
        setPhone(businessUnit.phone || '');
        setTaxIdUrl(businessUnit.taxIdUrl || '');
      } else {
        setName('');
        setAddress('');
        setPhone('');
        setTaxIdUrl('');
      }
    }
  }, [businessUnit, isOpen]);

  const handleSubmit = async () => {
    if (!firestore) return;
    const businessUnitsCollection = collection(firestore, 'business_units');

    const businessUnitData = {
      name,
      address,
      phone,
      taxIdUrl,
    };

    if (businessUnit) {
      const docRef = doc(businessUnitsCollection, businessUnit.id);
      setDocumentNonBlocking(docRef, businessUnitData, { merge: true });
    } else {
      await addDocumentNonBlocking(businessUnitsCollection, businessUnitData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{businessUnit ? 'Editar Unidad de Negocio' : 'Añadir Unidad de Negocio'}</DialogTitle>
          <DialogDescription>
            {businessUnit ? 'Edita los detalles de la unidad de negocio.' : 'Añade una nueva unidad a tu organización.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cédula Fiscal</Label>
            <FileUploader 
              onUploadComplete={setTaxIdUrl} 
              initialFileUrl={taxIdUrl}
              uploadPath="tax_ids"
              allowedTypes={['application/pdf', 'image/jpeg', 'image/png']}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
