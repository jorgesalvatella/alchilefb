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
import type { Supplier } from '@/lib/data';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';


interface AddEditSupplierDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  supplier: Supplier | null;
}

export function AddEditSupplierDialog({
  isOpen,
  onOpenChange,
  supplier,
}: AddEditSupplierDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (supplier) {
        setName(supplier.name);
        setContactPerson(supplier.contactPerson || '');
        setPhone(supplier.phone || '');
        setEmail(supplier.email || '');
    } else {
        setName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
    }
  }, [supplier, isOpen]);

  const handleSubmit = async () => {
    if (!firestore) return;
    const suppliersCollection = collection(firestore, 'suppliers');

    const supplierData = {
      name,
      contactPerson,
      phone,
      email,
    };

    if (supplier) {
      const docRef = doc(suppliersCollection, supplier.id);
      setDocumentNonBlocking(docRef, supplierData, { merge: true });
    } else {
      await addDocumentNonBlocking(suppliersCollection, supplierData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Proveedor' : 'Añadir Proveedor'}</DialogTitle>
          <DialogDescription>
            {supplier ? 'Edita los detalles del proveedor.' : 'Añade un nuevo proveedor a tu lista.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactPerson" className="text-right">
              Contacto
            </Label>
            <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
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
