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
import type { Group } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface AddEditGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: Group | null;
  businessUnitId: string;
  departmentId: string;
}

export function AddEditGroupDialog({
    isOpen,
    onOpenChange,
    group,
    businessUnitId,
    departmentId,
}: AddEditGroupDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (group) {
            setName(group.name || '');
            setDescription(group.description || '');
        } else {
            setName('');
            setDescription('');
        }
    }
  }, [group, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
        toast({
            title: 'Error',
            description: 'El nombre del grupo no puede estar vacío.',
            variant: 'destructive',
        });
        return;
    }

    if (!user) {
      toast({
          title: 'Error de autenticación',
          description: 'No se pudo verificar el usuario.',
          variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const groupData = { name, description };

      const url = group
        ? `/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${group.id}`
        : `/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos`;
      const method = group ? 'PUT' : 'POST';

      const response = await fetch(url, {
          method: method,
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(groupData),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error al ${group ? 'actualizar' : 'crear'} el grupo`);
      }

      toast({
          title: `Grupo ${group ? 'Actualizado' : 'Creado'}`,
          description: `El grupo se ha ${group ? 'actualizado' : 'creado'} correctamente.`,
      });
      onOpenChange(false);
      window.location.reload();

    } catch (error) {
      console.error(`Error ${group ? 'updating' : 'creating'} group:`, error);
      toast({
          title: 'Error',
          description: (error as Error).message || 'Ocurrió un problema al contactar el servidor.',
          variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
            {group ? 'Editar Grupo' : 'Añadir Grupo'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {group ? 'Edita los detalles del grupo.' : 'Añade un nuevo grupo a este departamento.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre del Grupo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/80">Descripción (Opcional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 text-white font-bold hover:scale-105 transition-transform duration-300" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}