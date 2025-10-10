'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { Group, Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { AddEditGroupDialog } from '@/components/admin/add-edit-group-dialog';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useDoc } from '@/firebase/firestore/use-doc';
import Link from 'next/link';

export default function AdminGroupsPage({ params }: { params: { id: string, depId: string } }) {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const businessUnitDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, `business_units/${params.id}`) : null),
    [firestore, params.id]
  );
  const { data: businessUnit } = useDoc<BusinessUnit>(businessUnitDoc);

  const departmentDoc = useMemoFirebase(
    () => (firestore ? doc(firestore, `business_units/${params.id}/departments/${params.depId}`) : null),
    [firestore, params.id, params.depId]
  );
  const { data: department } = useDoc<Department>(departmentDoc);

  const groupsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, `business_units/${params.id}/departments/${params.depId}/groups`) : null),
    [firestore, params.id, params.depId]
  );
  const { data: groups, isLoading } = useCollection<Group>(groupsCollection);

  const handleEdit = (item: Group) => {
    setSelectedGroup(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedGroup(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(collection(firestore, `business_units/${params.id}/departments/${params.depId}/groups`), id);
    deleteDocumentNonBlocking(docRef);
  };


  return (
    <>
        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-white">
                <span className="bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                    Grupos de {department?.name}
                </span>
            </h1>
            <p className="text-white/60 mt-4 text-lg md:text-xl">Unidad de Negocio: {businessUnit?.name}</p>
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
              {groups && groups.map((group) => (
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
    </>
  );
}
