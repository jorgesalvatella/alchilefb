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
import { useUser } from '@/firebase/provider';
import type { Concept, Supplier } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { MultiSelect } from '@/components/ui/multi-select';

interface ManageConceptSuppliersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  concept: Concept | null;
}

export function ManageConceptSuppliersDialog({
    isOpen,
    onOpenChange,
    concept,
}: ManageConceptSuppliersDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [associatedSuppliers, setAssociatedSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isOpen && concept && user) {
        setIsLoading(true);
        try {
          const token = await user.getIdToken();
          // Fetch all suppliers
          const allSuppliersRes = await fetch('/api/control/proveedores', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!allSuppliersRes.ok) throw new Error('Failed to fetch suppliers.');
          const allSuppliersData = await allSuppliersRes.json();
          setAllSuppliers(allSuppliersData);

          // Fetch associated suppliers
          const associatedSuppliersRes = await fetch(`/api/control/conceptos/${concept.id}/proveedores`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!associatedSuppliersRes.ok) throw new Error('Failed to fetch associated suppliers.');
          const associatedSuppliersData = await associatedSuppliersRes.json();
          setAssociatedSuppliers(associatedSuppliersData);
          setSelectedSupplierIds(associatedSuppliersData.map((s: Supplier) => s.id));

        } catch (error) {
          toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept, isOpen, user]);

  const handleSubmit = async () => {
    if (!concept || !user) return;
    setIsLoading(true);

    try {
        const token = await user.getIdToken();
        const originalIds = new Set(associatedSuppliers.map(s => s.id));
        const newIds = new Set(selectedSupplierIds);

        const idsToAdd = selectedSupplierIds.filter(id => !originalIds.has(id));
        const idsToRemove = associatedSuppliers.map(s => s.id).filter(id => !newIds.has(id));

        // Perform ADD operations
        for (const proveedorId of idsToAdd) {
            await fetch(`/api/control/conceptos/${concept.id}/proveedores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ proveedorId }),
            });
        }

        // Perform DELETE operations
        for (const proveedorId of idsToRemove) {
            await fetch(`/api/control/conceptos/${concept.id}/proveedores/${proveedorId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
        }

        toast({ title: 'Éxito', description: 'Proveedores actualizados correctamente.' });
        onOpenChange(false);
        window.location.reload();

    } catch (error) {
        toast({ title: 'Error', description: 'No se pudieron actualizar los proveedores.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const options = allSuppliers.map(s => ({ value: s.id, label: s.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Gestionar Proveedores para "{concept?.name}"
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Selecciona los proveedores autorizados para surtir este concepto.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isLoading ? (
                <p>Cargando...</p>
            ) : (
                <MultiSelect
                    key={selectedSupplierIds.join(',')}
                    options={options}
                    defaultValue={selectedSupplierIds}
                    onValueChange={setSelectedSupplierIds}
                    placeholder="Selecciona proveedores..."
                    className="w-full"
                />
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
