'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { SaleCategory } from '@/lib/data';

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  description: z.string().optional(),
});

interface AddEditSaleCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: SaleCategory | null;
  businessUnitId: string;
  departmentId: string;
}

export function AddEditSaleCategoryDialog({
  isOpen,
  onOpenChange,
  category,
  businessUnitId,
  departmentId,
}: AddEditSaleCategoryDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [category, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !businessUnitId || !departmentId) {
      toast({
        title: 'Error',
        description: 'No estás autenticado o faltan datos.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const url = category
        ? `/api/control/catalogo/categorias-venta/${category.id}`
        : '/api/control/catalogo/categorias-venta';
      const method = category ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...values,
          businessUnitId,
          departmentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${category ? 'actualizar' : 'crear'} la categoría.`);
      }

      toast({
        title: `Categoría ${category ? 'Actualizada' : 'Creada'}`,
        description: `La categoría "${values.name}" se ha guardado correctamente.`,
      });
      onOpenChange(false);
      window.location.reload(); // O idealmente, actualizar el estado en la página padre
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-black/80 backdrop-blur-sm border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-orange-400">{category ? 'Editar Categoría de Venta' : 'Añadir Nueva Categoría de Venta'}</DialogTitle>
          <DialogDescription>
            {category ? 'Edita los detalles de la categoría.' : 'Crea una nueva categoría para tus productos de venta.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Bebidas Calientes" {...field} className="bg-black/50 border-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Cafés, tés, infusiones..." {...field} className="bg-black/50 border-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
