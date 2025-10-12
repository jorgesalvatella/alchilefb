'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase/provider';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SaleProduct, BusinessUnit, Department, SaleCategory } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  price: z.coerce.number().positive({ message: 'El precio debe ser un número positivo.' }),
  description: z.string().optional(),
  imageUrl: z.string().url({ message: 'Por favor, introduce una URL válida.' }).optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  cost: z.coerce.number().nonnegative({ message: 'El costo no puede ser negativo.' }).default(0),
  platformFeePercent: z.coerce.number().nonnegative({ message: 'La comisión no puede ser negativa.' }).max(100).default(0),
  businessUnitId: z.string().min(1, { message: 'Debes seleccionar una unidad de negocio.' }),
  departmentId: z.string().min(1, { message: 'Debes seleccionar un departamento.' }),
  categoriaVentaId: z.string().min(1, { message: 'Debes seleccionar una categoría de venta.' }),
});

type SaleProductFormProps = {
  product?: SaleProduct | null;
};

export function SaleProductForm({ product }: SaleProductFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saleCategories, setSaleCategories] = useState<SaleCategory[]>([]);
  const [isLoadingBU, setIsLoadingBU] = useState(true);
  const [isLoadingDepts, setIsLoadingDepts] = useState(false);
  const [isLoadingCats, setIsLoadingCats] = useState(false);

  // Flags to prevent clearing fields during initial load (edit mode)
  const isBusinessUnitInitialLoad = useRef(true);
  const isDepartmentInitialLoad = useRef(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: product ? {
        ...product,
        price: product.price || 0,
        cost: product.cost || 0,
        platformFeePercent: product.platformFeePercent || 0,
    } : {
      name: '', price: 0, description: '', imageUrl: '', isAvailable: true, isTaxable: true,
      cost: 0, platformFeePercent: 0, businessUnitId: '', departmentId: '', categoriaVentaId: '',
    },
  });

  useEffect(() => {
    const fetchBusinessUnits = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/control/unidades-de-negocio', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('No se pudieron cargar las unidades de negocio.');
        setBusinessUnits(await res.json());
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoadingBU(false);
      }
    };
    fetchBusinessUnits();
  }, [user, toast]);

  const selectedBusinessUnitId = form.watch('businessUnitId');
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!user || !selectedBusinessUnitId) return;
      setIsLoadingDepts(true);
      setDepartments([]); setSaleCategories([]);

      // Only clear child fields if this is NOT the initial load (user manually changed selection)
      if (!isBusinessUnitInitialLoad.current) {
        if (form.getValues('departmentId')) form.setValue('departmentId', '');
        if (form.getValues('categoriaVentaId')) form.setValue('categoriaVentaId', '');
      } else {
        isBusinessUnitInitialLoad.current = false; // After first run, future changes are user-initiated
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/control/unidades-de-negocio/${selectedBusinessUnitId}/departamentos`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('No se pudieron cargar los departamentos.');
        setDepartments(await res.json());
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoadingDepts(false);
      }
    };
    if (selectedBusinessUnitId) fetchDepartments();
  }, [selectedBusinessUnitId, user, toast, form]);

  const selectedDepartmentId = form.watch('departmentId');
  useEffect(() => {
    const fetchSaleCategories = async () => {
      if (!user || !selectedDepartmentId) return;
      setIsLoadingCats(true);
      setSaleCategories([]);

      // Only clear child fields if this is NOT the initial load (user manually changed selection)
      if (!isDepartmentInitialLoad.current) {
        if (form.getValues('categoriaVentaId')) form.setValue('categoriaVentaId', '');
      } else {
        isDepartmentInitialLoad.current = false; // After first run, future changes are user-initiated
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/control/departamentos/${selectedDepartmentId}/categorias-venta`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('No se pudieron cargar las categorías de venta.');
        setSaleCategories(await res.json());
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoadingCats(false);
      }
    };
    if (selectedDepartmentId) fetchSaleCategories();
  }, [selectedDepartmentId, user, toast, form]);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/control/productos-venta/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!response.ok) throw new Error('Error al subir la imagen.');
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
    if (!user) return;
    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const url = product ? `/api/control/productos-venta/${product.id}` : '/api/control/productos-venta';
      const method = product ? 'PUT' : 'POST';
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(values) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al ${product ? 'actualizar' : 'crear'} el producto.`);
      }
      toast({ title: '¡Éxito!', description: `Producto ${product ? 'actualizado' : 'creado'} correctamente.` });
      router.push('/control/productos-venta');
      router.refresh();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-y-8 md:gap-x-4 lg:gap-x-8 pb-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-black/50 border-white/10">
            <CardHeader><CardTitle className="text-orange-400">Categorización</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="businessUnitId" render={({ field }) => (<FormItem><FormLabel>Unidad de Negocio</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLoadingBU}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingBU ? "Cargando..." : "Selecciona"} /></SelectTrigger></FormControl><SelectContent>{businessUnits.map(bu => <SelectItem key={bu.id} value={bu.id}>{bu.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="departmentId" render={({ field }) => (<FormItem><FormLabel>Departamento</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedBusinessUnitId || isLoadingDepts}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingDepts ? "Cargando..." : "Selecciona"} /></SelectTrigger></FormControl><SelectContent>{departments.map(dep => <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="categoriaVentaId" render={({ field }) => (<FormItem><FormLabel>Categoría de Venta</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartmentId || isLoadingCats}><FormControl><SelectTrigger><SelectValue placeholder={isLoadingCats ? "Cargando..." : "Selecciona"} /></SelectTrigger></FormControl><SelectContent>{saleCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-white/10">
            <CardHeader><CardTitle className="text-orange-400">Información Básica</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input placeholder="Taco de Pastor" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Precio de Venta (IVA Incl.)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="25.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea placeholder="Carne de cerdo marinada..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-white/10">
            <CardHeader><CardTitle className="text-orange-400">Imagen</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-md border border-dashed border-white/20 flex items-center justify-center">
                  {watchedImageUrl && watchedImageUrl.startsWith('http') && watchedImageUrl.length > 20 ? <Image src={watchedImageUrl} alt="Vista previa" fill className="object-cover rounded-md" /> : <span className="text-xs text-white/50">Vista previa</span>}
                </div>
                <div className="flex-1">
                  <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel className="sr-only">URL de la Imagen</FormLabel><FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}><Upload className="mr-2 h-4 w-4" />{isUploading ? 'Subiendo...' : 'Subir Archivo'}</Button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-black/50 border-white/10">
            <CardHeader><CardTitle className="text-orange-400">Parámetros de Rentabilidad</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="cost" render={({ field }) => (<FormItem><FormLabel>Costo del Producto</FormLabel><FormControl><Input type="number" step="0.01" placeholder="10.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="platformFeePercent" render={({ field }) => (<FormItem><FormLabel>Comisión de Plataforma (%)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="20" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex items-center flex-wrap gap-4 pt-2">
                <FormField control={form.control} name="isTaxable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3"><FormLabel className="text-xs md:text-sm">¿Lleva IVA?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="isAvailable" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3"><FormLabel className="text-xs md:text-sm">¿Disponible?</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-white/10 sticky top-4">
            <CardHeader><CardTitle className="text-orange-400">Análisis de Rentabilidad</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Precio Base (Subtotal):</span> <span>${profitability.basePrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>IVA (16%):</span> <span>${profitability.taxAmount.toFixed(2)}</span></div>
              <Separator className="my-2 bg-white/10" />
              <div className="flex justify-between"><span>Utilidad Bruta:</span> <span>${profitability.grossProfit.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Comisión ({watchedPlatformFee}%):</span> <span className="text-red-400">-${profitability.commissionAmount.toFixed(2)}</span></div>
              <Separator className="my-2 bg-white/10" />
              <div className="flex justify-between font-bold text-lg"><span>UTILIDAD NETA:</span> <span className={profitability.netProfit > 0 ? 'text-fresh-green' : 'text-red-500'}>${profitability.netProfit.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg"><span>MARGEN NETO:</span> <span className={profitability.netMargin > 0 ? 'text-fresh-green' : 'text-red-500'}>{profitability.netMargin.toFixed(2)}%</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 mt-6">
          <Button type="submit" disabled={isSubmitting || isUploading} className="w-full text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105 transition-transform">
            {isSubmitting ? 'Guardando...' : (product ? 'Guardar Cambios' : 'Crear Producto')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
