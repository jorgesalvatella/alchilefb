'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { BusinessUnit } from '@/lib/data';
import type { User } from 'firebase/auth';
import { X } from 'lucide-react';

// Esquema de validación
const formSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  razonSocial: z.string().min(1, { message: "La razón social es requerida." }),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddEditBusinessUnitDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  businessUnit: BusinessUnit | null;
  user: User | null;
  isUserLoading: boolean;
}

export function AddEditBusinessUnitDialog({ 
    isOpen, 
    onOpenChange, 
    businessUnit,
    user,
    isUserLoading
}: AddEditBusinessUnitDialogProps) {
  
  const [taxIdFile, setTaxIdFile] = useState<File | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', razonSocial: '', address: '', phone: '' }
  });

  useEffect(() => {
    setIsMounted(true);
    if (isOpen) {
      form.reset(businessUnit ? {
        name: businessUnit.name || '',
        razonSocial: businessUnit.razonSocial || '',
        address: businessUnit.address || '',
        phone: businessUnit.phone || '',
      } : { name: '', razonSocial: '', address: '', phone: '' });
      setTaxIdFile(null);
    }
  }, [businessUnit, isOpen, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) {
      form.setError("root", { type: "manual", message: "Debes iniciar sesión." });
      return;
    }

    try {
      const token = await user.getIdToken();
      let taxIdUrl = businessUnit?.taxIdUrl || '';

      // 1. Subir el archivo si existe
      if (taxIdFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', taxIdFile);

        const uploadResponse = await fetch('/api/control/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Error al subir el archivo.');
        }
        const uploadResult = await uploadResponse.json();
        taxIdUrl = uploadResult.url;
      }

      // 2. Crear la unidad de negocio con la URL del archivo
      const businessUnitData = { ...data, taxIdUrl };
      const url = businessUnit
        ? `/api/control/unidades-de-negocio/${businessUnit.id}`
        : '/api/control/unidades-de-negocio';
      const method = businessUnit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(businessUnitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ocurrió un error al guardar.');
      }

      onOpenChange(false);
      window.location.reload(); // Recargar para ver los cambios
    } catch (err: any) {
      form.setError("root", { type: "manual", message: err.message });
    }
  };

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-black/80 backdrop-blur-lg border border-white/10 text-white sm:max-w-md w-full rounded-lg p-6 grid gap-4">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-2xl font-headline bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            {businessUnit ? 'Editar' : 'Añadir'} Unidad de Negocio
          </h2>
          <p className="text-white/60">Completa los detalles de la unidad de negocio.</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            {/* ... Campos del formulario ... */}
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-white/80">Nombre</FormLabel><FormControl><Input {...field} className="bg-white/5 border-white/20" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="razonSocial" render={({ field }) => (<FormItem><FormLabel className="text-white/80">Razón Social</FormLabel><FormControl><Input {...field} className="bg-white/5 border-white/20" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel className="text-white/80">Dirección</FormLabel><FormControl><Input {...field} className="bg-white/5 border-white/20" /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel className="text-white/80">Teléfono</FormLabel><FormControl><Input {...field} className="bg-white/5 border-white/20" /></FormControl><FormMessage /></FormItem>)} />
            <FormItem>
              <FormLabel className="text-white/80">Cédula Fiscal (Opcional)</FormLabel>
              <FormControl><Input type="file" onChange={(e) => setTaxIdFile(e.target.files ? e.target.files[0] : null)} className="bg-white/5 border-white/20" /></FormControl>
              <FormMessage />
            </FormItem>
            
            {form.formState.errors.root && <p className="text-red-500 text-sm text-center">{form.formState.errors.root.message}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting || isUserLoading}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600" disabled={form.formState.isSubmitting || isUserLoading}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  );
}