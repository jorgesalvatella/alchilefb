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
import { useUser } from '@/firebase/provider';
import type { Supplier } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (supplier) {
            setName(supplier.name || '');
            setContactName(supplier.contactName || '');
            setPhone(supplier.phone || '');
            setEmail(supplier.email || '');
        } else {
            setName('');
            setContactName('');
            setPhone('');
            setEmail('');
        }
    }
  }, [supplier, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
        toast({ title: 'Error', description: 'El nombre del proveedor es obligatorio.', variant: 'destructive' });
        return;
    }
    if (!user) {
        toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' });
        return;
    }
    setIsLoading(true);

    try {
        const token = await user.getIdToken();
        const url = supplier ? `/api/control/proveedores/${supplier.id}` : '/api/control/proveedores';
        const method = supplier ? 'PUT' : 'POST';
        const supplierData = { name, contactName, phone, email };

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(supplierData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar el proveedor.');
        }

        toast({ title: 'Éxito', description: `Proveedor ${supplier ? 'actualizado' : 'creado'} correctamente.` });
        onOpenChange(false);
        window.location.reload();

    } catch (error) {
        toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            {supplier ? 'Editar Proveedor' : 'Añadir Proveedor'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Completa los detalles del proveedor.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName" className="text-white/80">Contacto (Opcional)</Label>
            <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white/80">Teléfono (Opcional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email (Opcional)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white font-bold" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}