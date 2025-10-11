'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase/provider';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

// Definimos el tipo de dato para un producto de venta, que coincida con el backend
type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
};

// Esquema de validación con Zod
const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  price: z.coerce.number().positive({ message: 'El precio debe ser un número positivo.' }),
  category: z.string().min(2, { message: 'La categoría es requerida.' }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: 'Por favor, introduce una URL válida.' }).optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
});

type AddEditSaleProductDialogProps = {
  product?: Product | null; // Si se pasa un producto, es modo edición
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void; // Callback para refrescar la tabla
};

export function AddEditSaleProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: AddEditSaleProductDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      category: product?.category || '',
      description: product?.description || '',
      imageUrl: product?.imageUrl || '',
      isAvailable: product?.isAvailable ?? true,
    },
  });

  // Resetear el formulario cuando el producto cambie (al abrir el diálogo)
  useState(() => {
    form.reset({
      name: product?.name || '',
      price: product?.price || 0,
      category: product?.category || '',
      description: product?.description || '',
      imageUrl: product?.imageUrl || '',
      isAvailable: product?.isAvailable ?? true,
    });
  }, [product, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ title: 'Error', description: 'Debes estar autenticado.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const url = product
        ? `/api/control/productos-venta/${product.id}`
        : '/api/control/productos-venta';
      const method = product ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error(`Error al ${product ? 'actualizar' : 'crear'} el producto.`);
      }

      toast({
        title: '¡Éxito!',
        description: `Producto ${product ? 'actualizado' : 'creado'} correctamente.`,
      });
      onSuccess(); // Llama al callback para refrescar los datos
      onOpenChange(false); // Cierra el diálogo
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-black border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Producto' : 'Añadir Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Modifica los detalles del producto.' : 'Rellena los campos para crear un nuevo producto.'}
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
                    <Input placeholder="Taco de Pastor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="25.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Tacos" {...field} />
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
                    <Textarea placeholder="Carne de cerdo marinada..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Disponible en el Menú</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} className="bg-fresh-green hover:bg-fresh-green/80 text-black">
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
