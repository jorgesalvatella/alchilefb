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
import type { Department, BusinessUnit } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';


interface AddEditDepartmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  department: Department | null;
  businessUnitId?: string; // Optional: pre-select business unit
}

export function AddEditDepartmentDialog({
    isOpen,
    onOpenChange,
    department,
    businessUnitId,
}: AddEditDepartmentDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);

  // ... (useEffect hooks remain the same)

  const handleSubmit = async () => {
    const finalBusinessUnitId = businessUnitId || selectedBusinessUnitId;
    if (!finalBusinessUnitId) {
        toast({
            title: 'Error',
            description: 'Por favor, selecciona una unidad de negocio.',
            variant: 'destructive',
        });
        return;
    }
    if (!name.trim()) {
        toast({
            title: 'Error',
            description: 'El nombre del departamento no puede estar vacío.',
            variant: 'destructive',
        });
        return;
    }

    if (!user) {
      toast({
          title: 'Error de autenticación',
          description: 'No se pudo verificar el usuario. Por favor, inicia sesión de nuevo.',
          variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const departmentData = { name, description };

      const url = department
        ? `/api/control/unidades-de-negocio/${finalBusinessUnitId}/departamentos/${department.id}`
        : `/api/control/unidades-de-negocio/${finalBusinessUnitId}/departamentos`;
      const method = department ? 'PUT' : 'POST';

      const response = await fetch(url, {
          method: method,
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(departmentData),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error al ${department ? 'actualizar' : 'crear'} el departamento`);
      }

      toast({
          title: `Departamento ${department ? 'Actualizado' : 'Creado'} `,
          description: `El departamento se ha ${department ? 'actualizado' : 'creado'} correctamente.`,
      });
      onOpenChange(false);
      window.location.reload();

    } catch (error) {
      console.error(`Error ${department ? 'updating' : 'creating'} department:`, error);
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
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 bg-clip-text text-transparent">
            {department ? 'Editar Departamento' : 'Añadir Departamento'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {department ? 'Edita los detalles del departamento.' : 'Añade un nuevo departamento a una unidad de negocio.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!businessUnitId && (
            <div className="space-y-2">
              <Label htmlFor="business-unit" className="text-white/80">Unidad de Negocio</Label>
              <Select
                onValueChange={setSelectedBusinessUnitId}
                defaultValue={selectedBusinessUnitId}
                disabled={!!department}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona una unidad de negocio" />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {businessUnits?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre del Departamento</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/80">Descripción (Opcional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 text-white font-bold hover:scale-105 transition-transform duration-300" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
