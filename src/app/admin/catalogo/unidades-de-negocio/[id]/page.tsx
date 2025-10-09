'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { AddEditDepartmentDialog } from '@/components/admin/add-edit-department-dialog';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';
import { useDoc } from '@/firebase/firestore/use-doc';

export default function AdminDepartmentsPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const businessUnitDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, `business_units/${params.id}`) : null),
    [firestore, params.id]
  );
  const { data: businessUnit } = useDoc<BusinessUnit>(businessUnitDoc);

  const departmentsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `business_units/${params.id}/departments`) : null),
    [firestore, params.id]
  );
  const { data: departments, isLoading } = useCollection<Department>(departmentsCollection);

  const handleEdit = (item: Department) => {
    setSelectedDepartment(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(collection(firestore, `business_units/${params.id}/departments`), id);
    deleteDocumentNonBlocking(docRef);
  };


  return (
    <>
        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-white">
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-600 bg-clip-text text-transparent">
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
              {departments && departments.map((dept) => (
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
    </>
  );
}
