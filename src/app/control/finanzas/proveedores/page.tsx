'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Supplier } from '@/lib/data';
import { PlusCircle, Pen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/provider';
import { AddEditSupplierDialog } from '@/components/control/add-edit-supplier-dialog';

export default function AdminSuppliersPage() {
  const { user, isUserLoading } = useUser();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    if (isUserLoading) {
        return; // Esperar a que termine la carga del usuario
    }
    if (!user) {
        setIsLoading(false);
        return; // No hay usuario, no hacer nada
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/control/proveedores', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo obtener los proveedores.');
        const data = await response.json();
        setSuppliers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, isUserLoading]);

  const handleAddNew = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Supplier) => {
    setSelectedSupplier(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este proveedor?')) return;
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/proveedores/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo eliminar el proveedor.');
        window.location.reload();
    } catch (err: any) {
        setError(err.message);
    }
  };

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Proveedores
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
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
              <TableHead className="text-white/80">Teléfono</TableHead>
              <TableHead className="text-white/80">Email</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isLoading || isUserLoading) ? (
              <TableRow><TableCell colSpan={5} className="text-center text-white/60 py-12">Cargando...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={5} className="text-center text-red-500 py-12">Error: {error}</TableCell></TableRow>
            ) : suppliers.map((supplier) => (
              <TableRow key={supplier.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{supplier.name}</TableCell>
                <TableCell className="text-white/80">{supplier.contactName}</TableCell>
                <TableCell className="text-white/80">{supplier.phone}</TableCell>
                <TableCell className="text-white/80">{supplier.email}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)} className="text-white/60 hover:text-orange-400"><Pen className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)} className="text-white/60 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
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
      />
    </>
  );
}
