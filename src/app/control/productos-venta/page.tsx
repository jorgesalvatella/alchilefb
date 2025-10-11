'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductsTable } from '@/components/control/products-table';
import { AddEditSaleProductDialog } from '@/components/control/add-edit-sale-product-dialog';

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdAt: string;
};

export default function AdminSaleProductsPage() {
  const { user, isUserLoading } = useUser();
  const [data, setData] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    if (user) {
      try {
        setIsLoading(true);
        const token = await user.getIdToken();
        const response = await fetch('/api/control/productos-venta', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los productos de venta.');
        }

        const products = await response.json();
        setData(products);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    } else if (!isUserLoading) {
      setIsLoading(false);
      setError('Acceso no autorizado.');
    }
  }, [user, isUserLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddNew = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!user || !confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      return;
    }
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/productos-venta/${product.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('No se pudo eliminar el producto.');
      }
      await fetchData(); // Refrescar datos
    } catch (error) {
      console.error(error);
    }
  };

  const handleSuccess = () => {
    fetchData(); // Refrescar los datos de la tabla
  };

  const renderContent = () => {
    if (isLoading || isUserLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    if (error) {
      return <p className="text-red-500">Error: {error}</p>;
    }

    return <ProductsTable data={data} onEdit={handleEdit} onDelete={handleDelete} />;
  };

  return (
    <main className="flex-1 p-6 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Productos de Venta</CardTitle>
          <Button className="bg-fresh-green hover:bg-fresh-green/80 text-black" onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Producto
          </Button>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      <AddEditSaleProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleSuccess}
        product={selectedProduct}
      />
    </main>
  );
}