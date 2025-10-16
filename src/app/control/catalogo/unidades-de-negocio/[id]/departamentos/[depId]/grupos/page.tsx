'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Group, BusinessUnit, Department } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AddEditGroupDialog } from '@/components/control/add-edit-group-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

function AdminGroupsPage({ user }: WithAuthProps) {
  const params = useParams();
  const businessUnitId = params.id as string;
  const departmentId = params.depId as string;

  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);

  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const breadcrumbItems = [
    { label: 'Catálogos', href: '/control/catalogo' },
    { label: 'Unidades de Negocio', href: '/control/catalogo/unidades-de-negocio' },
    { label: businessUnit?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos` },
    { label: department?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos` },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !businessUnitId || !departmentId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const [groupsRes, buRes, deptRes] = await Promise.all([
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos`, { headers }),
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}`, { headers }),
          fetch(`/api/control/departamentos/${departmentId}`, { headers }),
        ]);

        if (!groupsRes.ok || !buRes.ok || !deptRes.ok) {
          throw new Error('No se pudo obtener la información necesaria.');
        }

        const [groupsData, buData, deptData] = await Promise.all([
          groupsRes.json(),
          buRes.json(),
          deptRes.json(),
        ]);

        setGroups(groupsData);
        setBusinessUnit(buData);
        setDepartment(deptData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, businessUnitId, departmentId]);

  const handleAddNew = () => {
    setSelectedGroup(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Group) => {
    setSelectedGroup(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/grupos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar el grupo.');
      }

      toast({
        title: 'Grupo Eliminado',
        description: 'El grupo se ha eliminado correctamente.',
      });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message,
        variant: 'destructive',
      });
      console.error('Error deleting group:', err);
    }
  };

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Grupos de {department?.name}
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Grupo
        </Button>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando grupos...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-cyan-400">{group.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{group.description}</p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
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
                <Link href={`/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${group.id}/conceptos`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/60 hover:text-green-400"
                  >
                    <FolderKanban className="h-4 w-4" />
                  </Button>
                </Link>
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
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={3} className="text-center text-white/60 py-12">
                  Cargando grupos...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow className="border-b-0">
                <TableCell colSpan={3} className="text-center text-red-500 py-12">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && groups.map((group) => (
              <TableRow key={group.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{group.name}</TableCell>
                <TableCell className="text-white/80">{group.description}</TableCell>
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
                  <Link href={`/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${group.id}/conceptos`}>
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
        businessUnitId={businessUnitId}
        departmentId={departmentId}
      />
    </div>
  );
}

export default withAuth(AdminGroupsPage, 'admin');
