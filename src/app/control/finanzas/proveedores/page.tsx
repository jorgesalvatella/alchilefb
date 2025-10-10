'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { Supplier, Concept } from '@/lib/data';
import { PlusCircle, Pen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AddEditSupplierDialog } from '@/components/admin/add-edit-supplier-dialog';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function AdminSuppliersPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const suppliersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'suppliers') : null),
    [firestore]
  );
  const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersCollection);

  const conceptsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'concepts') : null),
    [firestore]
  );
  const { data: concepts } = useCollection<Concept>(conceptsCollection);

  const handleEdit = (item: Supplier) => {
    setSelectedSupplier(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(collection(firestore, 'suppliers'), id);
    deleteDocumentNonBlocking(docRef);
  };

  return (
    <>
        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-white">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Proveedores
                </span>
            </h1>
        </div>

        <div className="flex justify-end mb-8">
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Proveedor
            </Button>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">Nombre</TableHead>
                <TableHead className="text-white/80">Contacto</TableHead>
                <TableHead className="text-white/80">Email</TableHead>
                <TableHead className="text-white/80">Teléfono</TableHead>
                <TableHead className="text-right text-white/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="text-center text-white/60 py-12">
                    Cargando proveedores...
                  </TableCell>
                </TableRow>
              )}
              {suppliers && suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{supplier.name}</TableCell>
                  <TableCell className="text-white/80">{supplier.contactName}</TableCell>
                  <TableCell className="text-white/80">{supplier.email}</TableCell>
                  <TableCell className="text-white/80">{supplier.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(supplier as Supplier)}
                      className="text-white/60 hover:text-orange-400"
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supplier.id)}
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
        <AddEditSupplierDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
        concepts={concepts || []}
      />
    </>
  );
}