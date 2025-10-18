'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, X } from 'lucide-react';
import StorageImage from '@/components/StorageImage';

interface ProductItem {
  productId: string;
  quantity: number;
}

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'package' | 'promotion';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  packagePrice?: number;
  products?: ProductItem[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  appliesTo?: 'product' | 'category' | 'total_order';
  targetIds?: string[];
  imagePath?: string;
  imageUrl?: string;
}

interface SaleProduct {
  id: string;
  name: string;
  price: number;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  description: z.string().optional(),
  type: z.enum(['package', 'promotion']),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  packagePrice: z.coerce.number().optional(),
  products: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive()
  })).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.coerce.number().optional(),
  appliesTo: z.enum(['product', 'category', 'total_order']).optional(),
  targetIds: z.array(z.string()).optional(),
  businessUnitId: z.string().min(1, { message: 'Debes seleccionar una unidad de negocio.' }),
  departmentId: z.string().min(1, { message: 'Debes seleccionar un departamento.' }),
  categoryId: z.string().min(1, { message: 'Debes seleccionar una categoría.' }),
});

type PromotionFormProps = {
  promotion?: Promotion | null;
};

export function PromotionForm({ promotion }: PromotionFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  // Estados para las opciones de selección
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Image handling states
  const [imagePath, setImagePath] = useState<string | null>(promotion?.imagePath || null);
  const [imageUrl, setImageUrl] = useState<string | null>(promotion?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Helper function to convert ISO date string to yyyy-MM-dd format
  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: promotion ? {
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      isActive: promotion.isActive,
      startDate: formatDateForInput(promotion.startDate),
      endDate: formatDateForInput(promotion.endDate),
      packagePrice: promotion.packagePrice || 0,
      products: promotion.products || [],
      discountType: promotion.discountType || 'percentage',
      discountValue: promotion.discountValue || 0,
      appliesTo: promotion.appliesTo || 'total_order',
      targetIds: promotion.targetIds || [],
      businessUnitId: '',
      departmentId: '',
      categoryId: '',
    } : {
      name: '',
      description: '',
      type: 'package',
      isActive: true,
      startDate: '',
      endDate: '',
      packagePrice: 0,
      products: [],
      discountType: 'percentage',
      discountValue: 0,
      appliesTo: 'total_order',
      targetIds: [],
      businessUnitId: '',
      departmentId: '',
      categoryId: '',
    },
  });

  const watchedType = form.watch('type');
  const watchedAppliesTo = form.watch('appliesTo');
  const watchedDiscountType = form.watch('discountType');
  const watchedBusinessUnitId = form.watch('businessUnitId');
  const watchedDepartmentId = form.watch('departmentId');

  // Cargar unidades de negocio
  useEffect(() => {
    const fetchBusinessUnits = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await fetch('/api/control/unidades-de-negocio', { headers });
        if (!response.ok) throw new Error('No se pudo obtener las unidades de negocio.');
        setBusinessUnits(await response.json());
      } catch (err: any) {
        toast({
          title: 'Error al cargar unidades de negocio',
          description: err.message,
          variant: 'destructive',
        });
      }
    };
    fetchBusinessUnits();
  }, [user, toast]);

  // Cargar departamentos cuando cambia la unidad de negocio
  useEffect(() => {
    if (!watchedBusinessUnitId || !user) return;

    const fetchDepartments = async () => {
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await fetch(`/api/control/unidades-de-negocio/${watchedBusinessUnitId}/departamentos`, { headers });
        if (!response.ok) throw new Error('No se pudo obtener los departamentos.');
        setDepartments(await response.json());

        // Limpiar selección de departamento y categoría al cambiar unidad
        form.setValue('departmentId', '');
        form.setValue('categoryId', '');
        setCategories([]);
      } catch (err: any) {
        toast({
          title: 'Error al cargar departamentos',
          description: err.message,
          variant: 'destructive',
        });
      }
    };
    fetchDepartments();
  }, [watchedBusinessUnitId, user, toast, form]);

  // Cargar categorías cuando cambia el departamento
  useEffect(() => {
    if (!watchedDepartmentId || !user) return;

    const fetchCategories = async () => {
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await fetch(`/api/control/departamentos/${watchedDepartmentId}/categorias-venta`, { headers });
        if (!response.ok) throw new Error('No se pudo obtener las categorías.');
        setCategories(await response.json());

        // Limpiar selección de categoría al cambiar departamento
        form.setValue('categoryId', '');
      } catch (err: any) {
        toast({
          title: 'Error al cargar categorías',
          description: err.message,
          variant: 'destructive',
        });
      }
    };
    fetchCategories();
  }, [watchedDepartmentId, user, toast, form]);

  // Cargar productos de venta
  useEffect(() => {
    const fetchSaleProducts = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await fetch('/api/control/productos-venta', { headers });
        if (!response.ok) {
          throw new Error('No se pudo obtener la lista de productos.');
        }
        setSaleProducts(await response.json());
      } catch (err: any) {
        toast({
          title: 'Error al cargar productos',
          description: err.message,
          variant: 'destructive',
        });
      }
    };
    fetchSaleProducts();
  }, [user, toast]);

  useEffect(() => {
    if (promotion?.products) {
      const products = promotion.products || [];
      const selectedIds = products.map(p => p.productId);
      const quantities: Record<string, number> = {};
      products.forEach(p => {
        quantities[p.productId] = p.quantity;
      });
      setSelectedProducts(selectedIds);
      setProductQuantities(quantities);
    }
  }, [promotion]);

  const handleProductSelection = (values: string[]) => {
    setSelectedProducts(values);

    const newQuantities = { ...productQuantities };
    values.forEach(productId => {
      if (!newQuantities[productId]) {
        newQuantities[productId] = 1;
      }
    });

    Object.keys(newQuantities).forEach(productId => {
      if (!values.includes(productId)) {
        delete newQuantities[productId];
      }
    });

    setProductQuantities(newQuantities);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Archivo inválido',
        description: 'Por favor selecciona una imagen válida.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'La imagen no debe superar los 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!imageFile || !user) return;

    setIsUploadingImage(true);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('/api/control/promociones/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('No se pudo subir la imagen.');
      }

      const { url, storagePath } = await response.json();
      setImageUrl(url);
      setImagePath(storagePath);
      setImagePreview(null);
      setImageFile(null);

      toast({
        title: 'Imagen subida',
        description: 'La imagen se ha subido correctamente.',
      });
    } catch (err: any) {
      toast({
        title: 'Error al subir imagen',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePath(null);
    setImageUrl(null);
    setImagePreview(null);
    setImageFile(null);
  };

  const validateCustom = (values: z.infer<typeof formSchema>): string | null => {
    if (!values.name.trim()) {
      return 'El nombre es requerido.';
    }

    if (values.type === 'package') {
      const price = values.packagePrice || 0;
      if (price <= 0) {
        return 'El precio del paquete debe ser mayor a 0.';
      }
      if (selectedProducts.length === 0) {
        return 'Debes seleccionar al menos 1 producto para el paquete.';
      }
      for (const productId of selectedProducts) {
        if (!productQuantities[productId] || productQuantities[productId] <= 0) {
          return 'Todas las cantidades de productos deben ser mayores a 0.';
        }
      }
    }

    if (values.type === 'promotion') {
      const discount = values.discountValue || 0;
      if (!values.discountValue || discount <= 0) {
        return 'El valor del descuento es requerido y debe ser mayor a 0.';
      }
      if (values.discountType === 'percentage' && (discount < 0 || discount > 100)) {
        return 'El descuento porcentual debe estar entre 0 y 100.';
      }
      if (values.appliesTo !== 'total_order' && (!values.targetIds || values.targetIds.length === 0)) {
        return 'Debes seleccionar al menos un producto o categoría.';
      }
    }

    if (values.startDate && values.endDate) {
      const start = new Date(values.startDate);
      const end = new Date(values.endDate);
      if (end <= start) {
        return 'La fecha de fin debe ser posterior a la fecha de inicio.';
      }
    }

    return null;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      return;
    }

    const validationError = validateCustom(values);
    if (validationError) {
      toast({
        title: 'Error de validación',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();

      const payload: any = {
        name: values.name,
        description: values.description || '',
        type: values.type,
        isActive: values.isActive,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        categoryId: values.categoryId,
      };

      if (values.type === 'package') {
        payload.packagePrice = values.packagePrice;
        payload.packageItems = selectedProducts.map(productId => ({
          productId,
          name: saleProducts.find(p => p.id === productId)?.name || '',
          quantity: productQuantities[productId],
        }));
        if (imagePath) {
          payload.imagePath = imagePath;
        }
        if (imageUrl) {
          payload.imageUrl = imageUrl;
        }
      } else {
        payload.promoType = values.discountType === 'percentage' ? 'percentage' : 'fixed_amount';
        payload.promoValue = values.discountValue;
        payload.appliesTo = values.appliesTo;
        payload.targetIds = values.appliesTo === 'total_order' ? [] : (values.targetIds || []);
      }

      const url = promotion
        ? `/api/control/promotions/${promotion.id}`
        : '/api/control/promotions';

      const method = promotion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo guardar la promoción.');
      }

      const responseData = await response.json();

      toast({
        title: promotion ? 'Promoción Actualizada' : 'Promoción Creada',
        description: `La promoción se ha ${promotion ? 'actualizado' : 'creado'} correctamente.`,
      });

      router.push('/control/promociones');
      router.refresh();
    } catch (err: any) {
      toast({
        title: 'Error al guardar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const productOptions = saleProducts.map(product => ({
    label: product.name,
    value: product.id,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-y-8 md:gap-x-4 lg:gap-x-8 pb-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-black/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-orange-400">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Nombre de la Promoción</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Paquete Familiar"
                        {...field}
                        className="bg-white/10 border-white/20 text-white"
                      />
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
                    <FormLabel className="text-white">Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe la promoción o paquete..."
                        {...field}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-white">Tipo de Promoción</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="package" id="type-package" />
                          <Label htmlFor="type-package" className="text-white cursor-pointer">
                            Paquete (varios productos a un precio fijo)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="promotion" id="type-promotion" />
                          <Label htmlFor="type-promotion" className="text-white cursor-pointer">
                            Promoción (descuento en productos o pedidos)
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Unidad de Negocio</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecciona una unidad de negocio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Departamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchedBusinessUnitId}>
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecciona un departamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-white/60">
                      {!watchedBusinessUnitId && 'Primero selecciona una unidad de negocio'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!watchedDepartmentId}>
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-white/60">
                      {!watchedDepartmentId && 'Primero selecciona un departamento'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Estado Activo</FormLabel>
                      <FormDescription className="text-white/60">
                        Define si la promoción está activa o inactiva
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-black/50 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-orange-400">Vigencia</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </FormControl>
                    <FormDescription className="text-white/60">
                      Opcional. Deja vacío para que sea permanente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Fecha de Fin</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </FormControl>
                    <FormDescription className="text-white/60">
                      Opcional. Deja vacío para que sea permanente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {watchedType === 'package' && (
            <Card className="bg-black/50 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-orange-400">Configuración de Paquete</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="packagePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Precio del Paquete</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </FormControl>
                      <FormDescription className="text-white/60">
                        Precio total del paquete (IVA incluido)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Imagen del Paquete */}
                <div className="space-y-3">
                  <Label className="text-white">Imagen del Paquete (opcional)</Label>

                  {!imagePath && !imagePreview && (
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        disabled={isUploadingImage}
                        className="bg-white/10 border-white/20 text-white file:text-white"
                      />
                    </div>
                  )}

                  {imagePreview && (
                    <div className="space-y-3">
                      <div className="relative w-full max-w-sm">
                        <Image
                          src={imagePreview}
                          alt="Vista previa"
                          width={400}
                          height={300}
                          className="rounded-lg object-cover border border-white/20"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        onClick={handleImageUpload}
                        disabled={isUploadingImage}
                        className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                      </Button>
                    </div>
                  )}

                  {(imagePath || imageUrl) && !imagePreview && (
                    <div className="space-y-3">
                      <div className="relative w-full max-w-sm h-[300px]">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt="Imagen del paquete"
                            fill
                            sizes="400px"
                            className="rounded-lg object-cover border border-white/20"
                          />
                        ) : (
                          <StorageImage
                            filePath={imagePath || ''}
                            alt="Imagen del paquete"
                            fill
                            objectFit="cover"
                            className="rounded-lg object-cover border border-white/20"
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 z-10"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-white/60">
                        ✓ Imagen guardada. Puedes cambiarla seleccionando una nueva.
                      </p>
                    </div>
                  )}

                  <FormDescription className="text-white/60">
                    Sube una imagen atractiva para el paquete (máx. 5MB)
                  </FormDescription>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Productos del Paquete</Label>
                  <MultiSelect
                    options={productOptions}
                    defaultValue={selectedProducts}
                    onValueChange={handleProductSelection}
                    placeholder="Selecciona productos..."
                    className="bg-white/10 border-white/20"
                  />
                  <FormDescription className="text-white/60">
                    Selecciona los productos incluidos en el paquete
                  </FormDescription>
                </div>

                {selectedProducts.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-white">Cantidades</Label>
                    {selectedProducts.map((productId) => {
                      const product = saleProducts.find(p => p.id === productId);
                      return (
                        <div key={productId} className="flex items-center gap-4">
                          <span className="text-white/80 flex-1">{product?.name}</span>
                          <Input
                            type="number"
                            min="1"
                            value={productQuantities[productId] || 1}
                            onChange={(e) => setProductQuantities({
                              ...productQuantities,
                              [productId]: parseInt(e.target.value) || 1
                            })}
                            className="bg-white/10 border-white/20 text-white w-24"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {watchedType === 'promotion' && (
            <Card className="bg-black/50 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-orange-400">Configuración de Promoción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-white">Tipo de Descuento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="percentage" id="discount-percentage" />
                            <Label htmlFor="discount-percentage" className="text-white cursor-pointer">
                              Porcentaje
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fixed" id="discount-fixed" />
                            <Label htmlFor="discount-fixed" className="text-white cursor-pointer">
                              Monto Fijo
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">
                        Valor del Descuento {watchedDiscountType === 'percentage' && '(0-100)'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={watchedDiscountType === 'percentage' ? 100 : undefined}
                          placeholder={watchedDiscountType === 'percentage' ? '0-100' : '0.00'}
                          {...field}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </FormControl>
                      <FormDescription className="text-white/60">
                        {watchedDiscountType === 'percentage'
                          ? 'Porcentaje de descuento (ej: 15 para 15%)'
                          : 'Monto fijo de descuento en pesos'
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="appliesTo"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-white">Aplica a</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="product" id="applies-product" />
                            <Label htmlFor="applies-product" className="text-white cursor-pointer">
                              Producto Específico
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="category" id="applies-category" />
                            <Label htmlFor="applies-category" className="text-white cursor-pointer">
                              Categoría
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="total_order" id="applies-total" />
                            <Label htmlFor="applies-total" className="text-white cursor-pointer">
                              Total del Pedido
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedAppliesTo !== 'total_order' && (
                  <FormField
                    control={form.control}
                    name="targetIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">
                          {watchedAppliesTo === 'product' ? 'Productos' : 'Categorías'}
                        </FormLabel>
                        <FormControl>
                          {watchedAppliesTo === 'product' ? (
                            <MultiSelect
                              options={productOptions}
                              defaultValue={field.value || []}
                              onValueChange={field.onChange}
                              placeholder="Selecciona productos..."
                              className="bg-white/10 border-white/20"
                            />
                          ) : (
                            <Input
                              placeholder="IDs de categorías separados por comas"
                              value={(field.value || []).join(',')}
                              onChange={(e) => field.onChange(
                                e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                              )}
                              className="bg-white/10 border-white/20 text-white"
                            />
                          )}
                        </FormControl>
                        <FormDescription className="text-white/60">
                          Selecciona los {watchedAppliesTo === 'product' ? 'productos' : 'categorías'} que aplican para esta promoción
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-black/50 backdrop-blur-sm border-white/10 sticky top-4">
            <CardHeader>
              <CardTitle className="text-orange-400">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-white/60">Tipo:</span>
                <p className="text-white font-semibold">
                  {watchedType === 'package' ? 'Paquete' : 'Promoción'}
                </p>
              </div>

              {watchedType === 'package' && (
                <>
                  <div>
                    <span className="text-white/60">Precio del Paquete:</span>
                    <p className="text-white font-semibold text-lg">
                      ${form.watch('packagePrice') || 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-white/60">Productos Incluidos:</span>
                    <p className="text-white font-semibold">
                      {selectedProducts.length} producto(s)
                    </p>
                  </div>
                </>
              )}

              {watchedType === 'promotion' && (
                <>
                  <div>
                    <span className="text-white/60">Descuento:</span>
                    <p className="text-white font-semibold text-lg">
                      {watchedDiscountType === 'percentage'
                        ? `${form.watch('discountValue') || 0}%`
                        : `$${form.watch('discountValue') || 0}`
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-white/60">Aplica a:</span>
                    <p className="text-white font-semibold">
                      {watchedAppliesTo === 'product' && 'Productos específicos'}
                      {watchedAppliesTo === 'category' && 'Categorías'}
                      {watchedAppliesTo === 'total_order' && 'Total del pedido'}
                    </p>
                  </div>
                </>
              )}

              <div>
                <span className="text-white/60">Estado:</span>
                <p className={`font-semibold ${form.watch('isActive') ? 'text-green-400' : 'text-red-400'}`}>
                  {form.watch('isActive') ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 mt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-lg py-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105 transition-transform"
          >
            {isSubmitting ? 'Guardando...' : (promotion ? 'Guardar Cambios' : 'Crear Promoción')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
