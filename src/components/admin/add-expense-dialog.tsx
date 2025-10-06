'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore } from '@/firebase/provider';
import { collection, serverTimestamp } from 'firebase/firestore';
import { expenseCategories } from '@/lib/data';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddExpenseDialog({
  isOpen,
  onOpenChange,
}: AddExpenseDialogProps) {
  const firestore = useFirestore();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta de Crédito' | 'Transferencia Bancaria'>('Efectivo');
  const [department, setDepartment] = useState('');
  const [group, setGroup] = useState('');
  const [concept, setConcept] = useState('');
  
  const [availableConcepts, setAvailableConcepts] = useState<string[]>([]);

  useEffect(() => {
    if (department && expenseCategories.concepts[department as keyof typeof expenseCategories.concepts]) {
      setAvailableConcepts(expenseCategories.concepts[department as keyof typeof expenseCategories.concepts]);
    } else {
      setAvailableConcepts([]);
    }
    setConcept('');
  }, [department]);

  const handleSubmit = async () => {
    if (!firestore || !date) return;
    const expensesCollection = collection(firestore, 'expenses');

    const expenseData = {
      description,
      amount: Number(amount),
      date,
      paymentMethod,
      department,
      group,
      concept,
    };

    await addDocumentNonBlocking(expensesCollection, expenseData);
    onOpenChange(false);
    // Reset form
    setDescription('');
    setAmount(0);
    setDate(new Date());
    setPaymentMethod('Efectivo');
    setDepartment('');
    setGroup('');
    setConcept('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Registra un nuevo gasto para llevar un control de tus finanzas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Compra de aguacates para guacamole" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} placeholder="0.00" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="date">Fecha del Gasto</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Elige una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago</Label>
             <Select onValueChange={(value) => setPaymentMethod(value as any)} defaultValue={paymentMethod}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta de Crédito">Tarjeta de Crédito</SelectItem>
                <SelectItem value="Transferencia Bancaria">Transferencia Bancaria</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select onValueChange={setDepartment} value={department}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Selecciona un departamento" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.departments.map((dep) => (
                  <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">Grupo</Label>
            <Select onValueChange={setGroup} value={group}>
              <SelectTrigger id="group">
                <SelectValue placeholder="Selecciona un grupo" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.groups.map((grp) => (
                  <SelectItem key={grp} value={grp}>{grp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="concept">Concepto</Label>
            <Select onValueChange={setConcept} value={concept} disabled={!department}>
              <SelectTrigger id="concept">
                <SelectValue placeholder="Selecciona un concepto" />
              </SelectTrigger>
              <SelectContent>
                {availableConcepts.map((con) => (
                  <SelectItem key={con} value={con}>{con}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Guardar Gasto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
