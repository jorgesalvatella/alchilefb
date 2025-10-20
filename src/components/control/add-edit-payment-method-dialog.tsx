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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/firebase/provider';
import type { PaymentMethod } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

interface AddEditPaymentMethodDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  paymentMethod: PaymentMethod | null;
}

export function AddEditPaymentMethodDialog({
    isOpen,
    onOpenChange,
    paymentMethod,
}: AddEditPaymentMethodDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (paymentMethod) {
            setName(paymentMethod.name || '');
            setDescription(paymentMethod.description || '');
            setActive(paymentMethod.active !== undefined ? paymentMethod.active : true);
        } else {
            setName('');
            setDescription('');
            setActive(true);
        }
    }
  }, [paymentMethod, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
        toast({ title: 'Error', description: 'El nombre del método de pago es obligatorio.', variant: 'destructive' });
        return;
    }
    if (!user) {
        toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' });
        return;
    }
    setIsLoading(true);

    try {
        const token = await user.getIdToken();
        const url = paymentMethod ? `/api/control/metodos-pago/${paymentMethod.id}` : '/api/control/metodos-pago';
        const method = paymentMethod ? 'PUT' : 'POST';
        const paymentMethodData = { name, description, active };

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(paymentMethodData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al guardar el método de pago.');
        }

        toast({ title: 'Éxito', description: `Método de pago ${paymentMethod ? 'actualizado' : 'creado'} correctamente.` });
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
            {paymentMethod ? 'Editar Método de Pago' : 'Añadir Método de Pago'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Completa los detalles del método de pago.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/20"
              placeholder="Ej: Efectivo, Tarjeta de Crédito, Transferencia..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/80">Descripción (Opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/20 min-h-[80px]"
              placeholder="Descripción adicional del método de pago..."
            />
          </div>
          <div className="flex items-center justify-between space-x-2 rounded-lg border border-white/20 p-4 bg-white/5">
            <div className="space-y-0.5">
              <Label htmlFor="active" className="text-white/80">Estado</Label>
              <p className="text-sm text-white/60">
                {active ? 'El método de pago está activo' : 'El método de pago está inactivo'}
              </p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white font-bold" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
