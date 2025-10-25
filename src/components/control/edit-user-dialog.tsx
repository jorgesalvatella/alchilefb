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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUser } from '@/firebase/provider';
import type { AppUser, UserRole, BusinessUnit } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect } from '@/components/ui/multi-select';

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  userData: AppUser | null;
}

export function EditUserDialog({
    isOpen,
    onOpenChange,
    userData,
}: EditUserDialogProps) {
  const { user, claims } = useUser();
  const { toast } = useToast();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('usuario');
  const [active, setActive] = useState(true);
  const [sucursalIds, setSucursalIds] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Determine if current user is super_admin
  const isSuperAdmin = !!claims?.super_admin;

  useEffect(() => {
    async function fetchBusinessUnits() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/control/unidades-de-negocio', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch business units');
        const data = await response.json();
        setBusinessUnits(data);
      } catch (error) {
        toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
      }
    }

    if (isOpen) {
      fetchBusinessUnits();
    }
  }, [isOpen, user, toast]);

  // Initialize form when userData changes
  useEffect(() => {
    if (isOpen && userData) {
      setDisplayName(userData.displayName || '');
      setPhoneNumber(userData.phoneNumber || '');
      setRole(userData.role);
      setActive(userData.active);
      setSucursalIds(userData.sucursalIds || []);
      setArea(userData.area || '');
    }
  }, [userData, isOpen]);

  const handleSubmit = async () => {
    if (!userData || !user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' });
      return;
    }

    // Validate permissions: admin cannot assign super_admin role
    if (!isSuperAdmin && role === 'super_admin') {
      toast({ title: 'Error', description: 'No tienes permisos para asignar el rol de Super Admin.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const url = `/api/control/usuarios/${userData.id}`;

      const userUpdateData = {
        displayName: displayName || null,
        phoneNumber: phoneNumber || null,
        role,
        active,
        sucursalIds: sucursalIds || [],
        area: area || null,
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userUpdateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el usuario.');
      }

      // Check if role or active status changed (which affects permissions)
      const roleChanged = userData.role !== role;
      const activeChanged = userData.active !== active;

      if (roleChanged || activeChanged) {
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente. Los cambios en permisos se aplicarán cuando el usuario inicie sesión nuevamente.',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Éxito',
          description: 'Usuario actualizado correctamente.',
        });
      }

      onOpenChange(false);
      window.location.reload();

    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const sucursalOptions = businessUnits.map(bu => ({ label: bu.name, value: bu.id }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Editar Usuario
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Actualiza la información del usuario. Los campos vacíos se mantendrán sin cambios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Email (readonly) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input
              id="email"
              type="email"
              value={userData?.email || ''}
              className="bg-white/5 border-white/20 text-white/40"
              disabled
              readOnly
            />
            <p className="text-xs text-white/40">El email no se puede modificar</p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-white/80">Nombre Completo</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-white/5 border-white/20"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-white/80">Teléfono</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-white/5 border-white/20"
              placeholder="Ej: +52 1234567890"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-white/80">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/80 text-white border-white/20">
                <SelectItem value="usuario">Usuario</SelectItem>
                <SelectItem value="repartidor">Repartidor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isSuperAdmin && (
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                )}
              </SelectContent>
            </Select>
            {!isSuperAdmin && (
              <p className="text-xs text-white/40">Solo Super Admin puede asignar el rol de Super Admin</p>
            )}
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="active" className="text-white/80">Estado Activo</Label>
              <p className="text-xs text-white/40">Los usuarios inactivos no pueden iniciar sesión</p>
            </div>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          {/* Sucursales */}
          {(role === 'admin' || role === 'repartidor' || role === 'usuario') && (
            <div className="space-y-2">
              <Label htmlFor="sucursalIds" className="text-white/80">Sucursales Asignadas</Label>
              <MultiSelect
                options={sucursalOptions}
                onValueChange={setSucursalIds}
                defaultValue={sucursalIds}
                placeholder="Seleccionar sucursales..."
                className="bg-white/5 border-white/20"
              />
              <p className="text-xs text-white/40">Asigna una o más sucursales a este usuario.</p>
            </div>
          )}

          {/* Área */}
          <div className="space-y-2">
            <Label htmlFor="area" className="text-white/80">Área</Label>
            <Input
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="bg-white/5 border-white/20"
              placeholder="Ej: Operaciones, Ventas, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
