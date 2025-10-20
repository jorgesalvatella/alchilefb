'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/firebase/provider';
import type { Expense, BusinessUnit, Department, Group, Concept, Supplier, PaymentMethod } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Upload, X, CheckCircle } from 'lucide-react';

interface AddEditExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: Expense | null;
}

export function AddEditExpenseDialog({
    isOpen,
    onOpenChange,
    expense,
}: AddEditExpenseDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();

  // Form state
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [conceptId, setConceptId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'MXN'>('MXN');
  const [expenseDate, setExpenseDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Options for cascading selectors
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Load business units and payment methods on mount
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadInitialData = async () => {
      try {
        const token = await user.getIdToken();

        // Load business units
        const buResponse = await fetch('/api/control/unidades-de-negocio', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (buResponse.ok) {
          const buData = await buResponse.json();
          setBusinessUnits(buData);
        }

        // Load payment methods
        const pmResponse = await fetch('/api/control/metodos-pago', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (pmResponse.ok) {
          const pmData = await pmResponse.json();
          setPaymentMethods(pmData.filter((pm: PaymentMethod) => pm.active));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [isOpen, user]);

  // Load departments when business unit changes
  useEffect(() => {
    if (!businessUnitId || !user) {
      setDepartments([]);
      setDepartmentId('');
      return;
    }

    const loadDepartments = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setDepartments(data);
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };

    loadDepartments();
  }, [businessUnitId, user]);

  // Load groups when department changes
  useEffect(() => {
    if (!departmentId || !businessUnitId || !user) {
      setGroups([]);
      setGroupId('');
      return;
    }

    const loadGroups = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setGroups(data);
        }
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };

    loadGroups();
  }, [departmentId, businessUnitId, user]);

  // Load concepts when group changes
  useEffect(() => {
    if (!groupId || !departmentId || !businessUnitId || !user) {
      setConcepts([]);
      setConceptId('');
      return;
    }

    const loadConcepts = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${groupId}/conceptos`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setConcepts(data);
        }
      } catch (error) {
        console.error('Error loading concepts:', error);
      }
    };

    loadConcepts();
  }, [groupId, departmentId, businessUnitId, user]);

  // Load suppliers associated with concept
  useEffect(() => {
    if (!conceptId || !user) {
      setSuppliers([]);
      setSupplierId('');
      return;
    }

    const loadSuppliers = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/conceptos/${conceptId}/proveedores`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    };

    loadSuppliers();
  }, [conceptId, user]);

  // Initialize form when expense changes
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setBusinessUnitId(expense.businessUnitId || '');
        setDepartmentId(expense.departmentId || '');
        setGroupId(expense.groupId || '');
        setConceptId(expense.conceptId || '');
        setSupplierId(expense.supplierId || '');
        setPaymentMethodId(expense.paymentMethodId || '');
        setAmount(expense.amount?.toString() || '');
        setCurrency(expense.currency || 'MXN');
        setExpenseDate(expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '');
        setInvoiceNumber(expense.invoiceNumber || '');
        setDueDate(expense.dueDate ? new Date(expense.dueDate).toISOString().split('T')[0] : '');
        setDescription(expense.description || '');
        setAuthorizedBy(expense.authorizedBy || '');
        setReceiptImageUrl(expense.receiptImageUrl || '');
      } else {
        // Reset form
        setBusinessUnitId('');
        setDepartmentId('');
        setGroupId('');
        setConceptId('');
        setSupplierId('');
        setPaymentMethodId('');
        setAmount('');
        setCurrency('MXN');
        setExpenseDate('');
        setInvoiceNumber('');
        setDueDate('');
        setDescription('');
        setAuthorizedBy('');
        setReceiptImageUrl('');
        setSelectedFile(null);
      }
    }
  }, [expense, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadReceipt = async () => {
    if (!selectedFile || !user) {
      toast({ title: 'Error', description: 'Por favor selecciona un archivo.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/control/gastos/upload-receipt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen.');
      }

      const data = await response.json();
      setReceiptImageUrl(data.url);
      setSelectedFile(null);
      toast({ title: 'Éxito', description: 'Comprobante subido exitosamente.' });
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!businessUnitId || !departmentId || !groupId || !conceptId || !supplierId || !paymentMethodId || !amount || !expenseDate) {
      toast({ title: 'Error', description: 'Todos los campos obligatorios deben estar completos.', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Error', description: 'Debes iniciar sesión.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const token = await user.getIdToken();
      const url = expense ? `/api/control/gastos/${expense.id}` : '/api/control/gastos';
      const method = expense ? 'PUT' : 'POST';

      const expenseData = {
        businessUnitId,
        departmentId,
        groupId,
        conceptId,
        supplierId,
        paymentMethodId,
        amount: parseFloat(amount),
        currency,
        expenseDate,
        invoiceNumber,
        dueDate: dueDate || null,
        description,
        authorizedBy,
        receiptImageUrl: receiptImageUrl || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el gasto.');
      }

      toast({ title: 'Éxito', description: `Gasto ${expense ? 'actualizado' : 'creado'} correctamente.` });
      onOpenChange(false);
      window.location.reload();

    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            {expense ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Completa los detalles del gasto. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Cascading Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessUnit" className="text-white/80">Unidad de Negocio *</Label>
              <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-white/80">Departamento *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={!businessUnitId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona unidad primero..." />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group" className="text-white/80">Grupo *</Label>
              <Select value={groupId} onValueChange={setGroupId} disabled={!departmentId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona departamento primero..." />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="concept" className="text-white/80">Concepto *</Label>
              <Select value={conceptId} onValueChange={setConceptId} disabled={!groupId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona grupo primero..." />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {concepts.map((concept) => (
                    <SelectItem key={concept.id} value={concept.id}>{concept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-white/80">Proveedor *</Label>
              <Select value={supplierId} onValueChange={setSupplierId} disabled={!conceptId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona concepto primero..." />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-white/80">Método de Pago *</Label>
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white/80">Monto *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-white/5 border-white/20"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-white/80">Moneda *</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'USD' | 'MXN')}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/80 text-white">
                  <SelectItem value="MXN">MXN (Peso Mexicano)</SelectItem>
                  <SelectItem value="USD">USD (Dólar Americano)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenseDate" className="text-white/80">Fecha del Gasto *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>

          {/* Invoice Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber" className="text-white/80">Número de Factura/Boleta</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="bg-white/5 border-white/20"
                placeholder="Ej: F-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-white/80">Fecha de Vencimiento</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/80">Descripción/Notas</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/5 border-white/20 min-h-[80px]"
              placeholder="Detalles adicionales del gasto..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authorizedBy" className="text-white/80">Autorizado por</Label>
            <Input
              id="authorizedBy"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              className="bg-white/5 border-white/20"
              placeholder="Nombre de quien autorizó el gasto"
            />
          </div>

          {/* Receipt Image Upload */}
          <div className="space-y-2">
            <Label className="text-white/80">Comprobante (Imagen)</Label>

            {receiptImageUrl ? (
              <div className="space-y-2">
                <div className="relative w-full h-48 bg-white/5 rounded-lg overflow-hidden border border-white/20">
                  <Image
                    src={receiptImageUrl}
                    alt="Comprobante"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-400">Comprobante subido exitosamente</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReceiptImageUrl('')}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="receiptFile"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="bg-white/5 border-white/20 text-white/80"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  onClick={handleUploadReceipt}
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold"
                >
                  {isUploading ? (
                    'Subiendo...'
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Comprobante
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-white/40">
              {!expense ? 'Opcional al crear. Requerido antes de enviar para aprobación.' : 'Requerido para enviar a aprobación.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/60 hover:text-white" disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white font-bold" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Gasto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
