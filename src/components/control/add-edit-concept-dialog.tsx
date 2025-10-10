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
import { useUser, useFirestore } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { Concept } from '@/lib/data';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface AddEditConceptDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  concept: Concept | null;
  businessUnitId: string;
  departmentId: string;
  groupId: string;
}

export function AddEditConceptDialog({
    isOpen,
    onOpenChange,
    concept,
    businessUnitId,
    departmentId,
    groupId,
}: AddEditConceptDialogProps) {
  const firestore = useFirestore(); // Needed for editing
  const { user } = useUser();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        if (concept) {
            setName(concept.name || '');
            setDescription(concept.description || '');
        } else {
            setName('');
            setDescription('');
        }
    }
  }, [concept, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
        toast({
            title: 'Error',
            description: 'El nombre del concepto no puede estar vacío.',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);

    const conceptData = {
        name,
        description,
        businessUnitId,
        departmentId,
        groupId,
    };

    if (concept) {
      // --- Lógica de edición (TODO: migrar a API) ---
      if (!firestore) return;
      const conceptsCollection = collection(firestore, 'conceptos');
      const docRef = doc(conceptsCollection, concept.id);
      await setDocumentNonBlocking(docRef, conceptData, { merge: true });
      toast({
        title: 'Concepto Actualizado',
        description: 'Los cambios se han guardado correctamente.',
      });
      window.location.reload();
    } else {
      // --- Lógica de creación usando la API ---
      if (!user) {
        toast({
            title: 'Error de autenticación',
            description: 'No se pudo verificar el usuario.',
            variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${groupId}/conceptos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name, description }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al crear el concepto');
        }

        toast({
            title: 'Concepto Creado',
            description: 'El nuevo concepto se ha añadido correctamente.',
        });
        onOpenChange(false);
        window.location.reload();

      } catch (error) {
        console.error('Error creating concept:', error);
        toast({
            title: 'Error',
            description: (error as Error).message || 'Ocurrió un problema al contactar el servidor.',
            variant: 'destructive',
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
            {concept ? 'Editar Concepto' : 'Añadir Concepto'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {concept ? 'Edita los detalles del concepto.' : 'Añade un nuevo concepto a este grupo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/80">Nombre del Concepto</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/80">Descripción (Opcional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white/5 border-white/20" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 text-white font-bold hover:scale-105 transition-transform duration-300" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}