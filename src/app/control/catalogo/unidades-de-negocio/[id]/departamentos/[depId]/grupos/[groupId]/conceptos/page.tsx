'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Concept } from '@/lib/data';
import { PlusCircle, Pen, Trash2, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { useParams } from 'next/navigation';
import { AddEditConceptDialog } from '@/components/control/add-edit-concept-dialog';
import { ManageConceptSuppliersDialog } from '@/components/control/manage-concept-suppliers-dialog';

export default function AdminConceptsPage() {
  const { user } = useUser();
  const params = useParams();
  const businessUnitId = params.id as string;
  const departmentId = params.depId as string;
  const groupId = params.groupId as string;

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [isManageSuppliersOpen, setIsManageSuppliersOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !businessUnitId || !departmentId || !groupId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${groupId}/conceptos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los conceptos.');
        }

        const data = await response.json();
        setConcepts(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, businessUnitId, departmentId, groupId]);

  const handleAddNew = () => {
    setSelectedConcept(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Concept) => {
    setSelectedConcept(item);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log(`TODO: Implementar borrado para el ID: ${id} a través de la API`);
  };
  
  const handleManageSuppliers = (item: Concept) => {
    setSelectedConcept(item);
    setIsManageSuppliersOpen(true);
  };

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Conceptos
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Concepto
        </Button>
      </div>

      <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-white/80">Descripción</TableHead>
              <TableHead className="text-white/80">Proveedores</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={4} className="text-center text-white/60 py-12">
                  Cargando conceptos...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow className="border-b-0">
                <TableCell colSpan={4} className="text-center text-red-500 py-12">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && concepts.map((concept) => (
              <TableRow key={concept.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{concept.name}</TableCell>
                <TableCell className="text-white/80">{concept.description}</TableCell>
                <TableCell className="text-white/80">{concept.proveedoresIds?.length || 0}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleManageSuppliers(concept as Concept)}
                    className="text-white/60 hover:text-yellow-400"
                    title="Gestionar Proveedores"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(concept as Concept)}
                    className="text-white/60 hover:text-orange-400"
                    title="Editar Concepto"
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(concept.id)}
                    className="text-white/60 hover:text-red-500"
                    title="Eliminar Concepto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <AddEditConceptDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        concept={selectedConcept}
        businessUnitId={businessUnitId}
        departmentId={departmentId}
        groupId={groupId}
      />
      <ManageConceptSuppliersDialog
        isOpen={isManageSuppliersOpen}
        onOpenChange={setIsManageSuppliersOpen}
        concept={selectedConcept}
      />
    </>
  );
}