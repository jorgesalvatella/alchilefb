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
import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Concept, Group, Department, BusinessUnit } from '@/lib/data';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

import { useCollection } from '@/firebase/firestore/use-collection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Concept, Group, Department, BusinessUnit } from '@/lib/data';

interface AddEditConceptDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  concept: Concept | null;
}

export function AddEditConceptDialog({ 
    isOpen, 
    onOpenChange, 
    concept,
}: AddEditConceptDialogProps) {
  const firestore = useFirestore();
  const [name, setName] = useState('');
  const [selectedBusinessUnitId, setSelectedBusinessUnitId] = useState<string | undefined>();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | undefined>();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();

  const businessUnitsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'business_units') : null),
    [firestore]
  );
  const { data: businessUnits } = useCollection<BusinessUnit>(businessUnitsCollection);

  const departmentsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departments') : null),
    [firestore]
  );
  const { data: departments } = useCollection<Department>(departmentsCollection);

  const groupsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'groups') : null),
    [firestore]
  );
  const { data: groups } = useCollection<Group>(groupsCollection);

  useEffect(() => {
    if (isOpen) {
        if (concept) {
            setName(concept.name || '');
            // You might want to fetch the parent group, department and business unit to set the initial values
        } else {
            setName('');
            setSelectedBusinessUnitId(undefined);
            setSelectedDepartmentId(undefined);
            setSelectedGroupId(undefined);
        }
    }
  }, [concept, isOpen]);

  const handleSubmit = async () => {
    if (!firestore || !selectedGroupId) return;
    const conceptsCollection = collection(firestore, 'concepts');

    const conceptData = {
      name,
      groupId: selectedGroupId,
    };

    if (concept) {
      const docRef = doc(conceptsCollection, concept.id);
      setDocumentNonBlocking(docRef, conceptData, { merge: true });
    } else {
      await addDocumentNonBlocking(conceptsCollection, conceptData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
            {concept ? 'Editar Concepto' : 'Añadir Concepto'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {concept ? 'Edita los detalles del concepto.' : 'Añade un nuevo concepto a un grupo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!concept && (
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
              <div className="space-y-2">
                <Label htmlFor="group" className="text-white/80">Grupo</Label>
                <Select onValueChange={setSelectedGroupId} defaultValue={selectedGroupId} disabled={!selectedDepartmentId}>
                  <SelectTrigger className="w-full bg-white/5 border-white/20">
                    <SelectValue placeholder="Selecciona un grupo" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/80 text-white">
                    {groups?.filter(g => g.departmentId === selectedDepartmentId).map((group) => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre del Concepto</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white">Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 text-white font-bold hover:scale-105 transition-transform duration-300">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
