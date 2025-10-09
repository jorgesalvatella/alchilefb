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
import type { Group, Department, BusinessUnit } from '@/lib/data';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Group, Department, BusinessUnit } from '@/lib/data';

interface AddEditGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: Group | null;
}

export function AddEditGroupDialog({
    isOpen,
    onOpenChange,
    group,
}: AddEditGroupDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string | undefined>();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>();

  const businessUnitsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'business_units') : null),
    [firestore]
  );
  const { data: businessUnits } = useCollection<BusinessUnit>(businessUnitsCollection);

  const departmentsCollection = useMemoFirebase(
    () => (firestore && selectedBusinessUnitId ? collection(firestore, 'departments') : null),
    [firestore, selectedBusinessUnitId]
  );
  const { data: departments } = useCollection<Department>(departmentsCollection);

  useEffect(() => {
    if (isOpen) {
        if (group) {
            setName(group.name || '');
            // You might want to fetch the parent department and business unit to set the initial values
        } else {
            setName('');
            setSelectedBusinessUnitId(undefined);
            setSelectedDepartmentId(undefined);
        }
    }
  }, [group, isOpen]);

  const handleSubmit = async () => {
    if (!firestore || !selectedDepartmentId) return;
    const groupsCollection = collection(firestore, 'groups');

    const groupData = {
      name,
      departmentId: selectedDepartmentId,
    };

    if (group) {
      const docRef = doc(groupsCollection, group.id);
      setDocumentNonBlocking(docRef, groupData, { merge: true });
    } else {
      await addDocumentNonBlocking(groupsCollection, groupData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
            {group ? 'Editar Grupo' : 'Añadir Grupo'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {group ? 'Edita los detalles del grupo.' : 'Añade un nuevo grupo a un departamento.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!group && (
            <>
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
                <Label htmlFor="department" className="text-white/80">Departamento</Label>
                <Select onValueChange={setSelectedDepartmentId} defaultValue={selectedDepartmentId} disabled={!selectedBusinessUnitId}>
                  <SelectTrigger className="w-full bg-white/5 border-white/20">
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/80 text-white">
                    {departments?.filter(d => d.businessUnitId === selectedBusinessUnitId).map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre del Grupo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600 text-white font-bold hover:scale-105 transition-transform duration-300">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
