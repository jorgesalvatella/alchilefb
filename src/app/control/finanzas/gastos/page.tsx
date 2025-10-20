'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Expense, PaymentMethod } from '@/lib/data';
import { PlusCircle, Pen, Trash2, CheckCircle, XCircle, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditExpenseDialog } from '@/components/control/add-edit-expense-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';

export function AdminExpensesPageContent({ user }: WithAuthProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load payment methods
  useEffect(() => {
    if (!user) return;

    const loadPaymentMethods = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/control/metodos-pago', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data);
        }
      } catch (err) {
        console.error('Error loading payment methods:', err);
      }
    };

    loadPaymentMethods();
  }, [user]);

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
        let url = '/api/control/gastos';

        // Add status filter if not 'all'
        if (statusFilter !== 'all') {
          url += `?status=${statusFilter}`;
        }

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo obtener los gastos.');
        const data = await response.json();
        setExpenses(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, statusFilter]);

  const handleAddNew = () => {
    setSelectedExpense(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: Expense) => {
    setSelectedExpense(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este gasto?')) return;
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/gastos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo eliminar el gasto.');
        window.location.reload();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const handleApprove = async (id: string) => {
    if (!user || !confirm('¿Aprobar este gasto?')) return;
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/gastos/${id}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo aprobar el gasto.');
        window.location.reload();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Motivo del rechazo:');
    if (!reason || !user) return;
    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/gastos/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ rejectionReason: reason }),
        });
        if (!response.ok) throw new Error('No se pudo rechazar el gasto.');
        window.location.reload();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const handleViewImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any }> = {
      draft: { variant: 'outline', icon: FileText },
      pending: { variant: 'secondary', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle },
    };
    const config = variants[status] || { variant: 'outline', icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status === 'draft' && 'Borrador'}
        {status === 'pending' && 'Pendiente'}
        {status === 'approved' && 'Aprobado'}
        {status === 'rejected' && 'Rechazado'}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentMethodName = (paymentMethodId: string) => {
    const method = paymentMethods.find(pm => pm.id === paymentMethodId);
    return method ? method.name : paymentMethodId;
  };

  const breadcrumbItems = [
    { label: 'Finanzas', href: '/control/finanzas' },
    { label: 'Gastos', href: '/control/finanzas/gastos' },
  ];

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Gastos
          </span>
        </h1>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex gap-4 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-black/80 text-white border-white/20">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="approved">Aprobado</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAddNew} className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Registrar Gasto
        </Button>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center justify-between">
                  <span>{expense.expenseId}</span>
                  {getStatusBadge(expense.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><span className="font-semibold">Fecha:</span> {formatDate(expense.expenseDate)}</p>
                <p><span className="font-semibold">Monto:</span> {formatCurrency(expense.amount, expense.currency)}</p>
                {expense.receiptImageUrl && (
                  <button
                    onClick={() => handleViewImage(expense.receiptImageUrl!)}
                    className="flex items-center gap-2 text-green-500 hover:text-green-400 transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-xs">Ver comprobante</span>
                  </button>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} className="text-white/60 hover:text-orange-400">
                  <Pen className="h-4 w-4" />
                </Button>
                {user?.super_admin && expense.status === 'pending' && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleApprove(expense.id)} className="text-white/60 hover:text-green-500">
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleReject(expense.id)} className="text-white/60 hover:text-red-500">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} className="text-white/60 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
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
              <TableHead className="text-white/80">ID</TableHead>
              <TableHead className="text-white/80">Fecha</TableHead>
              <TableHead className="text-white/80">Monto</TableHead>
              <TableHead className="text-white/80">Estado</TableHead>
              <TableHead className="text-white/80">Método Pago</TableHead>
              <TableHead className="text-white/80">Comprobante</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-white/60 py-12">Cargando...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={7} className="text-center text-red-500 py-12">Error: {error}</TableCell></TableRow>
            ) : expenses.map((expense) => (
              <TableRow key={expense.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{expense.expenseId}</TableCell>
                <TableCell className="text-white/80">{formatDate(expense.expenseDate)}</TableCell>
                <TableCell className="text-white/80 font-semibold">{formatCurrency(expense.amount, expense.currency)}</TableCell>
                <TableCell>{getStatusBadge(expense.status)}</TableCell>
                <TableCell className="text-white/80 text-xs">{getPaymentMethodName(expense.paymentMethodId)}</TableCell>
                <TableCell>
                  {expense.receiptImageUrl ? (
                    <button
                      onClick={() => handleViewImage(expense.receiptImageUrl!)}
                      className="flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
                      title="Ver comprobante"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="text-xs">Ver</span>
                    </button>
                  ) : (
                    <span className="text-xs text-red-500">Sin imagen</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)} className="text-white/60 hover:text-orange-400">
                    <Pen className="h-4 w-4" />
                  </Button>
                  {user?.super_admin && expense.status === 'pending' && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleApprove(expense.id)} className="text-white/60 hover:text-green-500" title="Aprobar">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleReject(expense.id)} className="text-white/60 hover:text-red-500" title="Rechazar">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)} className="text-white/60 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddEditExpenseDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={selectedExpense}
      />

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="bg-black/90 backdrop-blur-lg border-white/10 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline bg-gradient-to-r from-green-400 to-cyan-500 bg-clip-text text-transparent">
              Comprobante de Gasto
            </DialogTitle>
          </DialogHeader>
          {selectedImageUrl && (
            <div className="relative w-full h-[600px] bg-white/5 rounded-lg overflow-hidden">
              <Image
                src={selectedImageUrl}
                alt="Comprobante de gasto"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(AdminExpensesPageContent, 'admin');
