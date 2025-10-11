'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Concept, BusinessUnit, Department, Group, Supplier } from '@/lib/data';
import { PlusCircle, Pen, Trash2, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { useParams } from 'next/navigation';
import { AddEditConceptDialog } from '@/components/control/add-edit-concept-dialog';
import { ManageConceptSuppliersDialog } from '@/components/control/manage-concept-suppliers-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminConceptsPage() {
  const { user } = useUser();
  const params = useParams();
  const { toast } = useToast();
  const businessUnitId = params.id as string;
  const departmentId = params.depId as string;
  const groupId = params.groupId as string;

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
        const headers = { 'Authorization': `Bearer ${token}` };

        const [conceptsRes, businessUnitRes, departmentRes, groupRes, suppliersRes] = await Promise.all([
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${groupId}/conceptos`, { headers }),
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}`, { headers }),
          fetch(`/api/control/departamentos/${departmentId}`, { headers }),
          fetch(`/api/control/grupos/${groupId}`, { headers }),
          fetch(`/api/control/proveedores`, { headers }),
        ]);

        if (!conceptsRes.ok || !businessUnitRes.ok || !departmentRes.ok || !groupRes.ok || !suppliersRes.ok) {
          throw new Error('No se pudo obtener toda la información necesaria.');
        }

        const [conceptsData, businessUnitData, departmentData, groupData, suppliersData] = await Promise.all([
          conceptsRes.json(),
          businessUnitRes.json(),
          departmentRes.json(),
          groupRes.json(),
          suppliersRes.json(),
        ]);

        setConcepts(conceptsData);
        setBusinessUnit(businessUnitData);
        setDepartment(departmentData);
        setGroup(groupData);
        setSuppliers(suppliersData);

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

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este concepto?')) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/conceptos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar el concepto.');
      }

      toast({
        title: 'Concepto Eliminado',
        description: 'El concepto se ha eliminado correctamente.',
      });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message,
        variant: 'destructive',
      });
      console.error('Error deleting concept:', err);
    }
  };
  
  const handleManageSuppliers = (item: Concept) => {
    setSelectedConcept(item);
    setIsManageSuppliersOpen(true);
  };

  // Helper function to get supplier names for a concept
  const getSupplierNames = (concept: Concept): string => {
    if (!concept.proveedoresIds || concept.proveedoresIds.length === 0) {
      return 'Sin proveedores';
    }

    const supplierNames = concept.proveedoresIds
      .map(id => suppliers.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    return supplierNames || 'Sin proveedores';
  };

  const breadcrumbItems = [
    { label: 'Catálogos', href: '/control/catalogo' },
    { label: 'Unidades de Negocio', href: '/control/catalogo/unidades-de-negocio' },
    { label: businessUnit?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos` },
    { label: department?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos` },
    { label: group?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${groupId}/conceptos` },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
            Conceptos de {group?.name}
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Concepto
        </Button>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando conceptos...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          concepts.map((concept) => (
            <Card key={concept.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-emerald-400">{concept.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>{concept.description}</p>
                <p><span className="font-semibold">Proveedores:</span> {getSupplierNames(concept)}</p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
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
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
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
                <TableCell className="text-white/80">{getSupplierNames(concept)}</TableCell>
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