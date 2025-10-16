'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/firebase/provider';
import { toast } from 'sonner';

// NOTE: This should be a shared type
interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'available' | 'busy' | 'offline';
}

interface AddEditDriverDialogProps {
  driver: Driver | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function AddEditDriverDialog({ driver, isOpen, onOpenChange, onSuccess }: AddEditDriverDialogProps) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!driver;

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setPhone(driver.phone);
      setVehicle(driver.vehicle);
    } else {
      // Reset form for new driver
      setName('');
      setPhone('');
      setVehicle('');
    }
  }, [driver, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name) {
      toast.error('El nombre es requerido.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const url = isEditing ? `/api/control/drivers/${driver.id}` : '/api/control/drivers';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone, vehicle }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el repartidor`);
      }

      toast.success(`Repartidor ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
      onSuccess();
      onOpenChange(false);

    } catch (error) {
      console.error('Error submitting driver form:', error);
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Repartidor' : 'Añadir Nuevo Repartidor'}</DialogTitle>
          <DialogDescription>
            Completa los detalles del repartidor. El nombre es requerido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Repartidor</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" className="bg-gray-800 border-gray-700" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: +56 9 1234 5678" className="bg-gray-800 border-gray-700" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehículo</Label>
            <Input id="vehicle" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Ej: Moto Honda CB190" className="bg-gray-800 border-gray-700" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-gray-800">Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-500 hover:bg-orange-600">
              {isLoading ? (isEditing ? 'Guardando...' : 'Creando...') : (isEditing ? 'Guardar Cambios' : 'Crear Repartidor')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
