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
import { uploadFile } from '@/app/actions';

interface AddEditBusinessUnitDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  businessUnit: BusinessUnit | null;
}

export function AddEditBusinessUnitDialog({ 
    isOpen, 
    onOpenChange, 
    businessUnit 
}: AddEditBusinessUnitDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxIdFile, setTaxIdFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
        if (businessUnit) {
            setName(businessUnit.name || '');
            setRazonSocial(businessUnit.razonSocial || '');
            setAddress(businessUnit.address || '');
            setPhone(businessUnit.phone || '');
        } else {
            setName('');
            setRazonSocial('');
            setAddress('');
            setPhone('');
        }
    }
  }, [businessUnit, isOpen]);

  const handleSubmit = async () => {
    if (!firestore) return;
    
    let taxIdUrl = businessUnit?.taxIdUrl || '';
    if (taxIdFile) {
      const formData = new FormData();
      formData.append('file', taxIdFile);
      const result = await uploadFile(formData);
      if (result.url) {
        taxIdUrl = result.url;
      } else {
        // TODO: Handle upload error
        console.error(result.error);
        return;
      }
    }

    const businessUnitsCollection = collection(firestore, 'business_units');

    const businessUnitData = {
      name,
      razonSocial,
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
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            {businessUnit ? 'Editar Unidad de Negocio' : 'Añadir Unidad de Negocio'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {businessUnit ? 'Edita los detalles de la unidad de negocio.' : 'Añade una nueva unidad de negocio.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="razonSocial" className="text-white/80">Razón Social</Label>
            <Input id="razonSocial" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address" className="text-white/80">Dirección</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white/80">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxIdFile" className="text-white/80">Cédula Fiscal</Label>
            <Input id="taxIdFile" type="file" onChange={(e) => setTaxIdFile(e.target.files ? e.target.files[0] : null)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105 transition-transform duration-300">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
