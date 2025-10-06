'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Productos</CardTitle>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Producto
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              )}
              {menuItems && menuItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item as MenuItem)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddEditProductDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
      />
    </>
  );
}
