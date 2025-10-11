import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase/provider';
import Image from 'next/image';

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
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';

// Definimos el tipo de dato para un producto de venta, que coincida con el backend
type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
  isTaxable: boolean;
  cost?: number;
  platformFeePercent?: number;
};

// Esquema de validación con Zod
const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  price: z.coerce.number().positive({ message: 'El precio debe ser un número positivo.' }),
  category: z.string().min(2, { message: 'La categoría es requerida.' }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: 'Por favor, introduce una URL válida.' }).optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  cost: z.coerce.number().nonnegative({ message: 'El costo no puede ser negativo.' }).default(0),
  platformFeePercent: z.coerce.number().nonnegative({ message: 'La comisión no puede ser negativa.' }).max(100).default(0),
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      category: product?.category || '',
      description: product?.description || '',
      imageUrl: product?.imageUrl || '',
      isAvailable: product?.isAvailable ?? true,
      isTaxable: product?.isTaxable ?? true,
      cost: product?.cost || 0,
      platformFeePercent: product?.platformFeePercent || 0,
    },
  });

  // Observar cambios en los campos para recalcular en tiempo real
  const watchedPrice = parseFloat(form.watch('price').toString()) || 0;
  const watchedCost = parseFloat(form.watch('cost').toString()) || 0;
  const watchedIsTaxable = form.watch('isTaxable');
  const watchedPlatformFee = parseFloat(form.watch('platformFeePercent').toString()) || 0;
  const watchedImageUrl = form.watch('imageUrl');

  const profitability = {
    basePrice: watchedIsTaxable ? watchedPrice / 1.16 : watchedPrice,
    taxAmount: watchedIsTaxable ? watchedPrice - (watchedPrice / 1.16) : 0,
    grossProfit: (watchedIsTaxable ? watchedPrice / 1.16 : watchedPrice) - watchedCost,
    commissionAmount: watchedPrice * (watchedPlatformFee / 100),
    netProfit: ((watchedIsTaxable ? watchedPrice / 1.16 : watchedPrice) - watchedCost) - (watchedPrice * (watchedPlatformFee / 100)),
    netMargin: ((watchedIsTaxable ? watchedPrice / 1.16 : watchedPrice) > 0) ? ((((watchedIsTaxable ? watchedPrice / 1.16 : watchedPrice) - watchedCost) - (watchedPrice * (watchedPlatformFee / 100))) / (watchedIsTaxable ? watchedPrice / 1.16 : watchedPrice)) * 100 : 0,
  };

  useEffect(() => {
    form.reset({
      name: product?.name || '',
      price: product?.price || 0,
      category: product?.category || '',
      description: product?.description || '',
      imageUrl: product?.imageUrl || '',
      isAvailable: product?.isAvailable ?? true,
      isTaxable: product?.isTaxable ?? true,
      cost: product?.cost || 0,
      platformFeePercent: product?.platformFeePercent || 0,
    });
  }, [product, form, open]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/control/productos-venta/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen.');
      }

      const { url } = await response.json();
      form.setValue('imageUrl', url, { shouldValidate: true });
      toast({ title: 'Imagen subida', description: 'La imagen se ha subido y asignado correctamente.' });
    } catch (error: any) {
      toast({ title: 'Error de subida', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

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
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-black border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Producto' : 'Añadir Producto'}</DialogTitle>
          <DialogDescription>
            {product ? 'Modifica los detalles del producto.' : 'Rellena los campos para crear un nuevo producto.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input placeholder="Taco de Pastor" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de Venta (IVA Incl.)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="25.00" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="Tacos" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl><Textarea placeholder="Carne de cerdo marinada..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel>Imagen del Producto</FormLabel>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-md border border-dashed border-white/20 flex items-center justify-center">
                    {watchedImageUrl ? (
                      <Image src={watchedImageUrl} alt="Vista previa" layout="fill" objectFit="cover" className="rounded-md" />
                    ) : (
                      <span className="text-xs text-white/50">Vista previa</span>
                    )}
                  </div>
                  <div className="flex-1">
                     <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="sr-only">URL de la Imagen</FormLabel>
                            <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
               <div className="space-y-4 rounded-lg bg-white/5 p-4">
                <h3 className="text-lg font-semibold text-white">Parámetros de Rentabilidad</h3>
                 <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo del Producto</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="10.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="platformFeePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comisión de Plataforma (%)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="20" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex items-center space-x-4 pt-2">
                    <FormField
                      control={form.control}
                      name="isTaxable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 flex-1">
                          <FormLabel>¿Lleva IVA?</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isAvailable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 flex-1">
                          <FormLabel>¿Disponible?</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
              </div>
              <div className="space-y-2 rounded-lg bg-white/5 p-4">
                <h3 className="text-md font-semibold text-white">Análisis de Rentabilidad</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Precio Base (Subtotal):</span> <span>${profitability.basePrice.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>IVA (16%):</span> <span>${profitability.taxAmount.toFixed(2)}</span></div>
                  <Separator className="my-1 bg-white/10" />
                  <div className="flex justify-between"><span>Utilidad Bruta:</span> <span>${profitability.grossProfit.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Comisión ({watchedPlatformFee}%):</span> <span className="text-red-400">-${profitability.commissionAmount.toFixed(2)}</span></div>
                  <Separator className="my-1 bg-white/10" />
                  <div className="flex justify-between font-bold text-base"><span>UTILIDAD NETA:</span> <span className={profitability.netProfit > 0 ? 'text-fresh-green' : 'text-red-500'}>${profitability.netProfit.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base"><span>MARGEN NETO:</span> <span className={profitability.netMargin > 0 ? 'text-fresh-green' : 'text-red-500'}>{profitability.netMargin.toFixed(2)}%</span></div>
                </div>
              </div>
            </div>
            <DialogFooter className="md:col-span-3">
              <Button type="submit" disabled={isSubmitting || isUploading} className="bg-fresh-green hover:bg-fresh-green/80 text-black w-full">
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
