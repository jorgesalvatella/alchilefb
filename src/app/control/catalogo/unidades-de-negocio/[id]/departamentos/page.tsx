'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban, ClipboardList, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AddEditDepartmentDialog } from '@/components/control/add-edit-department-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

function AdminDepartmentsPage({ user }: WithAuthProps) {
  const params = useParams();
  const businessUnitId = params.id as string;

  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);

  const { toast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const breadcrumbItems = [
    { label: 'Catálogos', href: '/control/catalogo' },
    { label: 'Unidades de Negocio', href: '/control/catalogo/unidades-de-negocio' },
    { label: businessUnit?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos` },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !businessUnitId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const [deptsRes, buRes] = await Promise.all([
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos`, { headers }),
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}`, { headers }),
        ]);

        if (!deptsRes.ok || !buRes.ok) {
          throw new Error('No se pudo obtener la información necesaria.');
        }

        const [deptsData, buData] = await Promise.all([
          deptsRes.json(),
          buRes.json(),
        ]);

        setDepartments(deptsData);
        setBusinessUnit(buData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, businessUnitId]);

  const handleAddNew = () => {
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Department) => {
    setSelectedDepartment(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este departamento?')) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/departamentos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar el departamento.');
      }

      toast({
        title: 'Departamento Eliminado',
        description: 'El departamento se ha eliminado correctamente.',
      });
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message,
        variant: 'destructive',
      });
      console.error('Error deleting department:', err);
    }
  };

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Departamentos de {businessUnit?.name}
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Departamento
        </Button>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando departamentos...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          departments.map((dept) => (
            <Card key={dept.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-orange-400">{dept.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>{dept.description}</p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(dept as Department)}
                  className="text-white/60 hover:text-orange-400"
                >
                  <Pen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(dept.id)}
                  className="text-white/60 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-blue-400">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-black/80 border-white/20 text-white">
                    <DropdownMenuItem asChild>
                      <Link href={`/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${dept.id}/grupos`}>
                        <FolderKanban className="mr-2 h-4 w-4" />
                        <span>Grupos de Gastos</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${dept.id}/categorias-venta`}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>Categorías de Venta</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  Cargando departamentos...
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
            {!isLoading && !error && departments.map((dept) => (
              <TableRow key={dept.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{dept.name}</TableCell>
                <TableCell className="text-white/80">{dept.description}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(dept as Department)}
                    className="text-white/60 hover:text-orange-400"
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(dept.id)}
                    className="text-white/60 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white/60 hover:text-blue-400">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-black/80 border-white/20 text-white">
                      <DropdownMenuItem asChild>
                        <Link href={`/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${dept.id}/grupos`}>
                          <FolderKanban className="mr-2 h-4 w-4" />
                          <span>Grupos de Gastos</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${dept.id}/categorias-venta`}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          <span>Categorías de Venta</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <AddEditDepartmentDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDepartment}
        businessUnitId={businessUnitId}
      />
    </div>
  );
}

export default withAuth(AdminDepartmentsPage, 'admin');