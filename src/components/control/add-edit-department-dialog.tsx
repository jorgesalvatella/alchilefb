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
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { Department, BusinessUnit } from '@/lib/data';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Department, BusinessUnit } from '@/lib/data';

interface AddEditDepartmentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  department: Department | null;
}

export function AddEditDepartmentDialog({
    isOpen,
    onOpenChange,
    department,
}: AddEditDepartmentDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string | undefined>();

  const businessUnitsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'business_units') : null),
    [firestore]
  );
  const { data: businessUnits } = useCollection<BusinessUnit>(businessUnitsCollection);

  useEffect(() => {
    if (isOpen) {
        if (department) {
            setName(department.name || '');
            setSelectedBusinessUnitId(department.businessUnitId);
        } else {
            setName('');
            setSelectedBusinessUnitId(undefined);
        }
    }
  }, [department, isOpen]);

  const handleSubmit = async () => {
    if (!firestore || !selectedBusinessUnitId) return;
    const departmentsCollection = collection(firestore, 'departments');

    const departmentData = {
      name,
      businessUnitId: selectedBusinessUnitId,
    };

    if (department) {
      const docRef = doc(departmentsCollection, department.id);
      setDocumentNonBlocking(docRef, departmentData, { merge: true });
    } else {
      await addDocumentNonBlocking(departmentsCollection, departmentData);
    }
    onOpenChange(false);
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
          <div className="space-y-2">
            <Label htmlFor="business-unit" className="text-white/80">Unidad de Negocio</Label>
            <Select onValueChange={setSelectedBusinessUnitId} defaultValue={selectedBusinessUnitId}>
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
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre del Departamento</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 text-white font-bold hover:scale-105 transition-transform duration-300">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
