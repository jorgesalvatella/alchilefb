'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SaleCategory, Department, BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AddEditSaleCategoryDialog } from '@/components/control/add-edit-sale-category-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

function AdminSaleCategoriesPage({ user }: WithAuthProps) {
  const params = useParams();
  const businessUnitId = params.id as string;
  const departmentId = params.depId as string;

  const [businessUnit, setBusinessUnit] = useState<BusinessUnit | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [categories, setCategories] = useState<SaleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SaleCategory | null>(null);

  const breadcrumbItems = [
    { label: 'Catálogos', href: '/control/catalogo' },
    { label: 'Unidades de Negocio', href: '/control/catalogo/unidades-de-negocio' },
    { label: businessUnit?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos` },
    { label: department?.name || '...', href: `/control/catalogo/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/categorias-venta` },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !businessUnitId || !departmentId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const [catRes, deptRes, buRes] = await Promise.all([
          fetch(`/api/control/departamentos/${departmentId}/categorias-venta`, { headers }),
          fetch(`/api/control/departamentos/${departmentId}`, { headers }),
          fetch(`/api/control/unidades-de-negocio/${businessUnitId}`, { headers }),
        ]);

        if (!catRes.ok || !deptRes.ok || !buRes.ok) {
          throw new Error('No se pudo obtener la información necesaria.');
        }

        const [catData, deptData, buData] = await Promise.all([
          catRes.json(),
          deptRes.json(),
          buRes.json(),
        ]);

        setCategories(catData);
        setDepartment(deptData);
        setBusinessUnit(buData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, businessUnitId, departmentId]);

  const handleAddNew = () => {
    setSelectedCategory(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: SaleCategory) => {
    setSelectedCategory(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/catalogo/categorias-venta/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar la categoría.');
      }

      toast({
        title: 'Categoría Eliminada',
        description: 'La categoría se ha eliminado correctamente.',
      });
      window.location.reload();
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
            Categorías de Venta
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          Para el departamento: <strong>{department?.name}</strong>
        </p>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Categoría
        </Button>
      </div>

      {/* Mobile & Desktop Views */}
      <div className="md:hidden space-y-4">
        {isLoading ? <p className="text-center text-white/60 py-12">Cargando...</p> : error ? <p className="text-center text-red-500 py-12">Error: {error}</p> :
          categories.map((cat) => (
            <Card key={cat.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader><CardTitle className="text-orange-400">{cat.name}</CardTitle></CardHeader>
              <CardContent className="text-sm"><p>{cat.description}</p></CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="text-white/60 hover:text-orange-400"><Pen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-white/60 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          ))
        }
      </div>

      <div className="hidden md:block bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-white/80">Descripción</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow className="border-b-0"><TableCell colSpan={3} className="text-center text-white/60 py-12">Cargando...</TableCell></TableRow> :
             error ? <TableRow className="border-b-0"><TableCell colSpan={3} className="text-center text-red-500 py-12">Error: {error}</TableCell></TableRow> :
             categories.map((cat) => (
              <TableRow key={cat.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{cat.name}</TableCell>
                <TableCell className="text-white/80">{cat.description}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} className="text-white/60 hover:text-orange-400"><Pen className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)} className="text-white/60 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <AddEditSaleCategoryDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        businessUnitId={businessUnitId}
        departmentId={departmentId}
      />
    </div>
  );
}

export default withAuth(AdminSaleCategoriesPage, 'admin');