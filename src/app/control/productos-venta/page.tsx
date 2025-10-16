'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SaleProduct } from '@/lib/data';
import { PlusCircle, Pen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

function AdminSaleProductsPage({ user }: WithAuthProps) {
  const { toast } = useToast();
  
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Productos de Venta', href: '/control/productos-venta' },
  ];

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch('/api/control/productos-venta', { headers });
      if (!response.ok) {
        throw new Error('No se pudo obtener la lista de productos.');
      }
      setProducts(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/productos-venta/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar el producto.');
      }
      toast({
        title: 'Producto Eliminado',
        description: 'El producto se ha eliminado correctamente.',
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Productos de Venta
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          Gestiona los artículos de tu menú.
        </p>
      </div>

      <div className="flex justify-end mb-8">
        <Button asChild className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <Link href="/control/productos-venta/nuevo">
            <PlusCircle className="mr-2 h-5 w-5" />
            Añadir Producto
          </Link>
        </Button>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {isLoading ? <p className="text-center text-white/60 py-12">Cargando...</p> : error ? <p className="text-center text-red-500 py-12">Error: {error}</p> :
          products.map((product) => (
            <Card key={product.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader><CardTitle className="text-orange-400">{product.name}</CardTitle></CardHeader>
              <CardContent className="text-sm break-words">
                <p>{product.description}</p>
                <p className="font-bold text-lg mt-2">${product.price.toFixed(2)}</p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 flex-wrap">
                <Button asChild variant="ghost" size="icon" className="text-white/60 hover:text-orange-400">
                  <Link href={`/control/productos-venta/${product.id}/editar`} aria-label="edit icon">
                    <Pen className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-white/60 hover:text-red-500" data-testid={`delete-button-${product.id}`}><Trash2 className="h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          ))
        }
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-white/80">Descripción</TableHead>
              <TableHead className="text-white/80">Precio</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow className="border-b-0"><TableCell colSpan={4} className="text-center text-white/60 py-12">Cargando...</TableCell></TableRow> :
             error ? <TableRow className="border-b-0"><TableCell colSpan={4} className="text-center text-red-500 py-12">Error: {error}</TableCell></TableRow> :
             products.map((product) => (
              <TableRow key={product.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{product.name}</TableCell>
                <TableCell className="text-white/80">{product.description}</TableCell>
                <TableCell className="text-white/80">${product.price.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="icon" className="text-white/60 hover:text-orange-400">
                    <Link href={`/control/productos-venta/${product.id}/editar`} aria-label="edit icon">
                      <Pen className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-white/60 hover:text-red-500" data-testid={`delete-button-${product.id}`}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default withAuth(AdminSaleProductsPage, 'admin');