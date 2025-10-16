'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Group, Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditGroupDialog } from '@/components/admin/add-edit-group-dialog';
import Link from 'next/link';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import { useToast } from '@/hooks/use-toast';

function AdminGroupsPage({ user, params }: WithAuthProps & { params: { id: string, depId: string } }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch business unit and department data
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !params.id || !params.depId) return;

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
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [user, params.id, params.depId]);

  // Fetch groups data
  useEffect(() => {
    const fetchGroups = async () => {
      if (!user || !params.id || !params.depId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${params.id}/departamentos/${params.depId}/grupos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los grupos.');
        }

        const data = await response.json();
        setGroups(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [user, params.id, params.depId]);

  const handleEdit = (item: Group) => {
    setSelectedGroup(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedGroup(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // TODO: Implementar borrado real a través de la API
    toast({
      title: 'Función no implementada',
      description: `El borrado para el ID: ${id} aún no está conectado a la API.`,
    });
  };


  return (
    <div className="pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Grupos de {department?.name}
                </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">Unidad de Negocio: {businessUnit?.name}</p>
        </div>

        <div className="flex justify-end mb-8">
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Grupo
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
                    Cargando grupos...
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
              {!isLoading && !error && groups.map((group) => (
                <TableRow key={group.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{group.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(group as Group)}
                      className="text-white/60 hover:text-orange-400"
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(group.id)}
                      className="text-white/60 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link href={`/admin/catalogo/unidades-de-negocio/${params.id}/departamentos/${params.depId}/grupos/${group.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/60 hover:text-green-400"
                      >
                        <FolderKanban className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <AddEditGroupDialog
            isOpen={dialogOpen}
            onOpenChange={setDialogOpen}
            group={selectedGroup}
            businessUnitId={params.id}
            departmentId={params.depId}
        />
    </div>
  );
}

export default withAuth(AdminGroupsPage, 'admin');