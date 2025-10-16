'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditDepartmentDialog } from '@/components/admin/add-edit-department-dialog';
import Link from 'next/link';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import { useToast } from '@/hooks/use-toast';

function AdminDepartmentsPage({ user, params }: WithAuthProps & { params: { id: string } }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch business unit data
  useEffect(() => {
    const fetchBusinessUnit = async () => {
      if (!user || !params.id) return;

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${params.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          setBusinessUnit(await response.json());
        }
      } catch (err) {
        console.error('Error fetching business unit:', err);
      }
    };

    fetchBusinessUnit();
  }, [user, params.id]);

  // Fetch departments data
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!user || !params.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${params.id}/departamentos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los departamentos.');
        }

        const data = await response.json();
        setDepartments(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [user, params.id]);

  const handleEdit = (item: Department) => {
    setSelectedDepartment(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDepartment(null);
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
                    Departamentos de {businessUnit?.name}
                </span>
            </h1>
        </div>

        <div className="flex justify-end mb-8">
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Departamento
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
                    Cargando departamentos...
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
              {!isLoading && !error && departments.map((dept) => (
                <TableRow key={dept.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{dept.name}</TableCell>
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
                    <Link href={`/admin/catalogo/unidades-de-negocio/${params.id}/departamentos/${dept.id}`}>
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
        <AddEditDepartmentDialog
            isOpen={dialogOpen}
            onOpenChange={setDialogOpen}
            department={selectedDepartment}
            businessUnitId={params.id}
        />
    </div>
  );
}

export default withAuth(AdminDepartmentsPage, 'admin');