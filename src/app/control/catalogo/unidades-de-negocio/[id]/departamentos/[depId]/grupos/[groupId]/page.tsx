'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Concept, Group, Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditConceptDialog } from '@/components/admin/add-edit-concept-dialog';
import { useUser } from '@/firebase/provider';

export default function AdminConceptsPage({ params }: { params: { id: string, depId: string, groupId: string } }) {
  const { user } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);

  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch business unit, department, and group data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !params.id || !params.depId || !params.groupId) return;

      try {
        const token = await user.getIdToken();

        // Fetch business unit
        const buResponse = await fetch(`/api/control/unidades-de-negocio/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (buResponse.ok) {
          setBusinessUnit(await buResponse.json());
        }

        // Fetch department
        const deptResponse = await fetch(`/api/control/departamentos/${params.depId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (deptResponse.ok) {
          setDepartment(await deptResponse.json());
        }

        // Fetch group
        const groupResponse = await fetch(`/api/control/grupos/${params.groupId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (groupResponse.ok) {
          setGroup(await groupResponse.json());
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [user, params.id, params.depId, params.groupId]);

  // Fetch concepts data
  useEffect(() => {
    const fetchConcepts = async () => {
      if (!user || !params.id || !params.depId || !params.groupId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${params.id}/departamentos/${params.depId}/grupos/${params.groupId}/conceptos`, {
          headers: { 'Authorization': `Bearer ${token}` },
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

    fetchConcepts();
  }, [user, params.id, params.depId, params.groupId]);

  const handleEdit = (item: Concept) => {
    setSelectedConcept(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedConcept(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log(`TODO: Implementar borrado para el ID: ${id} a través de la API`);
  };


  return (
    <div className="pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Conceptos de {group?.name}
                </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">Unidad de Negocio: {businessUnit?.name} / Departamento: {department?.name}</p>
        </div>

        <div className="flex justify-end mb-8">
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Concepto
            </Button>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">Nombre</TableHead>
                <TableHead className="text-right text-white/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={2} className="text-center text-white/60 py-12">
                    Cargando conceptos...
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={2} className="text-center text-red-500 py-12">
                    Error: {error}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && concepts.map((concept) => (
                <TableRow key={concept.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{concept.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(concept as Concept)}
                      className="text-white/60 hover:text-orange-400"
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(concept.id)}
                      className="text-white/60 hover:text-red-500"
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
            businessUnitId={params.id}
            departmentId={params.depId}
            groupId={params.groupId}
        />
    </div>
  );
}
