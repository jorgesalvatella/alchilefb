'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import type { Department } from '@/lib/data';
import { PlusCircle, Pen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditDepartmentDialog } from '@/components/admin/add-edit-department-dialog';
// Nota: La lógica de borrado también deberá migrarse a la API en el futuro.
// import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AdminDepartmentsPage() {
  const { user } = useUser();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('http://localhost:8080/api/departments', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch departments');
        }

        const data = await response.json();
        setDepartments(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();
  }, [user]);

  const handleEdit = (item: Department) => {
    setSelectedDepartment(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // TODO: Implement API call for deletion
    console.log("Deletion via API not implemented yet for ID:", id);
    // const docRef = doc(collection(firestore, 'departments'), id);
    // deleteDocumentNonBlocking(docRef);
  };

  return (
    <div className="pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Departamentos
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
                <TableHead className="text-white/80">ID de Unidad de Negocio</TableHead>
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
                  {/* Mostramos el ID directamente, ya que no cargamos las unidades de negocio aquí */}
                  <TableCell className="text-white/80">{dept.businessUnitId}</TableCell>
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
        />
    </div>
  );
}