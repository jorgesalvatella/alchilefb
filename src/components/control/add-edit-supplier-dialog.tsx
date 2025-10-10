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

import { useCollection } from '@/firebase/firestore/use-collection';
import { MultiSelect } from '@/components/ui/multi-select';
import type { Concept, Supplier } from '@/lib/data';

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
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [conceptIds, setConceptIds] = useState<string[]>([]);

  const conceptsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'concepts') : null),
    [firestore]
  );
  const { data: concepts } = useCollection<Concept>(conceptsCollection);

  useEffect(() => {
    if (isOpen) {
        if (supplier) {
            setName(supplier.name || '');
            setContactName(supplier.contactName || '');
            setEmail(supplier.email || '');
            setPhone(supplier.phone || '');
            setConceptIds(supplier.conceptIds || []);
        } else {
            setName('');
            setContactName('');
            setEmail('');
            setPhone('');
            setConceptIds([]);
        }
    }
  }, [supplier, isOpen]);

  const handleSubmit = async () => {
    if (!firestore) return;
    const suppliersCollection = collection(firestore, 'suppliers');

    const supplierData = {
      name,
      contactName,
      email,
      phone,
      conceptIds,
    };

    if (supplier) {
      const docRef = doc(suppliersCollection, supplier.id);
      setDocumentNonBlocking(docRef, supplierData, { merge: true });
    } else {
      await addDocumentNonBlocking(suppliersCollection, supplierData);
    }
    onOpenChange(false);
  };

  const conceptOptions = concepts?.map(concept => ({ label: concept.name, value: concept.id })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            {supplier ? 'Editar Proveedor' : 'Añadir Proveedor'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {supplier ? 'Edita los detalles de tu proveedor.' : 'Añade un nuevo proveedor a tu lista.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName" className="text-white/80">Nombre de Contacto</Label>
            <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white/80">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="concepts" className="text-white/80">Conceptos</Label>
            <MultiSelect
              options={conceptOptions}
              onValueChange={setConceptIds}
              defaultValue={conceptIds}
              placeholder="Selecciona conceptos..."
            />
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
