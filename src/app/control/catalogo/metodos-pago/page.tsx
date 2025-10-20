'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { PaymentMethod } from '@/lib/data';
import { PlusCircle, Pen, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditPaymentMethodDialog } from '@/components/control/add-edit-payment-method-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

function AdminPaymentMethodsPage({ user }: WithAuthProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/control/metodos-pago', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo obtener los métodos de pago.');
        const data = await response.json();
        setPaymentMethods(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleAddNew = () => {
    setSelectedPaymentMethod(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: PaymentMethod) => {
    setSelectedPaymentMethod(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este método de pago?')) return;
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/metodos-pago/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo eliminar el método de pago.');
        window.location.reload();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const breadcrumbItems = [
    { label: 'Catálogos', href: '/control/catalogo' },
    { label: 'Métodos de Pago', href: '/control/catalogo/metodos-pago' },
  ];

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Métodos de Pago
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Método de Pago
        </Button>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          paymentMethods.map((method) => (
            <Card key={method.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center justify-between">
                  {method.name}
                  {method.active ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {method.description && <p><span className="font-semibold">Descripción:</span> {method.description}</p>}
                <p><span className="font-semibold">Estado:</span> {method.active ? 'Activo' : 'Inactivo'}</p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(method)} className="text-white/60 hover:text-orange-400"><Pen className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)} className="text-white/60 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block bg-black/50 backdrop-blur-sm border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-white/80">Descripción</TableHead>
              <TableHead className="text-white/80">Estado</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-white/60 py-12">Cargando...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={4} className="text-center text-red-500 py-12">Error: {error}</TableCell></TableRow>
            ) : paymentMethods.map((method) => (
              <TableRow key={method.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{method.name}</TableCell>
                <TableCell className="text-white/80">{method.description || '-'}</TableCell>
                <TableCell className="text-white/80">
                  <div className="flex items-center gap-2">
                    {method.active ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Activo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">Inactivo</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(method)} className="text-white/60 hover:text-orange-400"><Pen className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)} className="text-white/60 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddEditPaymentMethodDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        paymentMethod={selectedPaymentMethod}
      />
    </div>
  );
}

export default withAuth(AdminPaymentMethodsPage, 'admin');
