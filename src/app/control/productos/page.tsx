'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { PlusCircle, Pen } from 'lucide-react';
import { useState } from 'react';
import { AddEditProductDialog } from '@/components/admin/add-edit-product-dialog';
import type { MenuItem } from '@/lib/data';

export default function AdminProductsPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  const menuItemsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'menu_items') : null),
    [firestore]
  );
  const { data: menuItems, isLoading } = useCollection<MenuItem>(menuItemsCollection);

  const handleEdit = (item: MenuItem) => {
    setSelectedProduct(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  return (
    <div className="pt-32">
        <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Productos
                </span>
            </h1>
        </div>
        <div className="flex justify-end mb-8">
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Producto
            </Button>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">Nombre</TableHead>
                <TableHead className="text-white/80">Categoría</TableHead>
                <TableHead className="text-white/80">Precio</TableHead>
                <TableHead className="text-right text-white/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={4} className="text-center text-white/60 py-12">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              )}
              {menuItems && menuItems.map((item) => (
                <TableRow key={item.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{item.name}</TableCell>
                  <TableCell className="text-white/80">{item.category}</TableCell>
                  <TableCell className="text-white/80">${item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item as MenuItem)}
                      className="text-white/60 hover:text-orange-400"
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      <AddEditProductDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
      />
    </div>
  );
}