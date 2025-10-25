'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// NOTE: This should be a shared type
interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'available' | 'busy' | 'offline';
  userId?: string; // Add userId to driver interface
}

interface UnlinkedRepartidorUser {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedRepartidorUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const isEditing = !!driver;

  const fetchUnlinkedUsers = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/control/unlinked-repartidor-users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch unlinked repartidor users');
      }
      const data = await response.json();
      setUnlinkedUsers(data);
    } catch (error) {
      console.error('Error fetching unlinked users:', error);
      toast.error('Error al cargar usuarios repartidores no vinculados.');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      if (driver) {
        setName(driver.name);
        setPhone(driver.phone);
        setVehicle(driver.vehicle);
        setSelectedUserId(driver.userId || null);
      } else {
        // Reset form for new driver
        setName('');
        setPhone('');
        setVehicle('');
        setSelectedUserId(null);
        fetchUnlinkedUsers(); // Fetch unlinked users only when adding a new driver
      }
    }
  }, [driver, isOpen, fetchUnlinkedUsers]);

  // Auto-cargar datos cuando se selecciona un usuario
  useEffect(() => {
    if (selectedUserId && !isEditing) {
      // Buscar el usuario seleccionado en unlinkedUsers
      const selectedUser = unlinkedUsers.find(u => u.uid === selectedUserId);

      if (selectedUser) {
        // Auto-llenar nombre desde el usuario
        setName(selectedUser.displayName || selectedUser.email?.split('@')[0] || '');

        // Auto-llenar teléfono (quitar +52 para mostrarlo limpio)
        if (selectedUser.phoneNumber) {
          const cleanPhone = selectedUser.phoneNumber.replace(/^\+52/, '');
          setPhone(cleanPhone);
        } else {
          setPhone('');
        }
      }
    }
  }, [selectedUserId, unlinkedUsers, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit - selectedUserId:", selectedUserId);
    if (!user || !name) {
      toast.error('El nombre es requerido.');
      return;
    }
    if (!isEditing && !selectedUserId) {
      toast.error('Debes seleccionar un usuario para vincular al repartidor.');
      return;
    }

    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const url = isEditing ? `/api/control/drivers/${driver.id}` : '/api/control/drivers';
      const method = isEditing ? 'PUT' : 'POST';

      const body = {
        name,
        phone,
        vehicle,
        ...(isEditing ? {} : { userId: selectedUserId }), // Only send userId when creating
      };

      console.log("Sending body:", body);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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

  const userOptions = unlinkedUsers.map(u => ({
    label: u.displayName || u.email || u.uid,
    value: u.uid,
  }));

  console.log("AddEditDriverDialog - userOptions:", userOptions);
  console.log("AddEditDriverDialog - selectedUserId:", selectedUserId);

  const handleUserChange = (newUserId: string) => {
    console.log('🎯 AddEditDriverDialog handleUserChange called with:', newUserId);
    setSelectedUserId(newUserId);
    console.log('   State will be updated to:', newUserId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogRef} className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Repartidor' : 'Añadir Nuevo Repartidor'}</DialogTitle>
          <DialogDescription>
            Completa los detalles del repartidor. El nombre es requerido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="user-selector">Vincular Usuario Repartidor</Label>
              <Select value={selectedUserId || undefined} onValueChange={handleUserChange}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Selecciona un usuario repartidor..." />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={5}
                  container={dialogRef.current}
                >
                  {userOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      No hay usuarios repartidores sin vincular.
                    </div>
                  ) : (
                    userOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Solo se muestran usuarios con rol 'repartidor' que aún no tienen un perfil de repartidor asignado.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Repartidor</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" className="bg-gray-800 border-gray-700" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 9981234567" className="bg-gray-800 border-gray-700" />
            {!isEditing && selectedUserId && phone && (
              <p className="text-xs text-green-400">✓ Auto-cargado del perfil del usuario (puedes editarlo si es necesario)</p>
            )}
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
