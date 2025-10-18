'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Pen, Trash2, Package, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import Link from 'next/link';

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
}

function AdminPromotionsPage({ user }: WithAuthProps) {
  const { toast } = useToast();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Promociones', href: '/control/promociones' },
  ];

  const fetchPromotions = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch('/api/control/promotions', { headers });
      if (!response.ok) {
        throw new Error('No se pudo obtener la lista de promociones.');
      }
      setPromotions(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPromotions();
    }
  }, [user]);

  const handleActiveToggle = async (id: string, isActive: boolean) => {
    if (!user) return;

    // Optimistic UI update
    setPromotions(prevPromotions =>
      prevPromotions.map(p => (p.id === id ? { ...p, isActive } : p))
    );

    try {
      const token = await user.getIdToken();
      const promotion = promotions.find(p => p.id === id);
      if (!promotion) return;

      const response = await fetch(`/api/control/promotions/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...promotion, isActive }),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar la promoción.');
      }

      toast({
        title: 'Promoción Actualizada',
        description: `La promoción ahora está ${isActive ? 'activa' : 'inactiva'}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error al actualizar',
        description: err.message,
        variant: 'destructive',
      });
      fetchPromotions();
    }
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar esta promoción?')) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/control/promotions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo eliminar la promoción.');
      }
      toast({
        title: 'Promoción Eliminada',
        description: 'La promoción se ha eliminado correctamente.',
      });
      fetchPromotions();
    } catch (err: any) {
      toast({
        title: 'Error al eliminar',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getVigencia = (promotion: Promotion) => {
    if (!promotion.startDate && !promotion.endDate) return 'Permanente';
    if (promotion.startDate && promotion.endDate) {
      return `${formatDate(promotion.startDate)} - ${formatDate(promotion.endDate)}`;
    }
    if (promotion.startDate) return `Desde ${formatDate(promotion.startDate)}`;
    if (promotion.endDate) return `Hasta ${formatDate(promotion.endDate)}`;
    return 'N/A';
  };

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Promociones
          </span>
        </h1>
        <p className="text-xl text-white/80 max-w-2xl mx-auto">
          Gestiona paquetes y promociones de tu negocio.
        </p>
      </div>

      <div className="flex justify-end mb-8">
        <Button
          asChild
          className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300"
        >
          <Link href="/control/promociones/nuevo">
            <PlusCircle className="mr-2 h-5 w-5" />
            Nueva Promoción
          </Link>
        </Button>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          promotions.map((promotion) => (
            <Card key={promotion.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center gap-2">
                  {promotion.type === 'package' ? (
                    <Package className="h-5 w-5" />
                  ) : (
                    <Tag className="h-5 w-5" />
                  )}
                  {promotion.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm break-words">
                <p className="text-white/80 mb-2">{promotion.description}</p>
                <div className="space-y-2 mt-4">
                  <p>
                    <span className="font-semibold">Tipo:</span>{' '}
                    {promotion.type === 'package' ? 'Paquete' : 'Promoción'}
                  </p>
                  <p>
                    <span className="font-semibold">Vigencia:</span>{' '}
                    {getVigencia(promotion)}
                  </p>
                  {promotion.type === 'package' && promotion.packagePrice && (
                    <p className="font-bold text-lg text-yellow-400">
                      ${promotion.packagePrice.toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id={`active-switch-mobile-${promotion.id}`}
                      checked={!!promotion.isActive}
                      onCheckedChange={(checked) => handleActiveToggle(promotion.id, checked)}
                    />
                    <label htmlFor={`active-switch-mobile-${promotion.id}`}>
                      {promotion.isActive ? 'Activo' : 'Inactivo'}
                    </label>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 flex-wrap">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-orange-400"
                >
                  <Link href={`/control/promociones/${promotion.id}/editar`} aria-label="edit icon">
                    <Pen className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(promotion.id)}
                  className="text-white/60 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-white/80">Tipo</TableHead>
              <TableHead className="text-white/80">Estado</TableHead>
              <TableHead className="text-white/80">Vigencia</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={5} className="text-center text-white/60 py-12">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow className="border-b-0">
                <TableCell colSpan={5} className="text-center text-red-500 py-12">
                  Error: {error}
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promotion) => (
                <TableRow key={promotion.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2">
                      {promotion.type === 'package' ? (
                        <Package className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <Tag className="h-4 w-4 text-orange-400" />
                      )}
                      {promotion.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-white/80">
                    {promotion.type === 'package' ? 'Paquete' : 'Promoción'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!promotion.isActive}
                        onCheckedChange={(checked) => handleActiveToggle(promotion.id, checked)}
                      />
                      <span className={promotion.isActive ? 'text-green-400' : 'text-white/60'}>
                        {promotion.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/80">
                    {getVigencia(promotion)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="text-white/60 hover:text-orange-400"
                    >
                      <Link href={`/control/promociones/${promotion.id}/editar`} aria-label="edit icon">
                        <Pen className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(promotion.id)}
                      className="text-white/60 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default withAuth(AdminPromotionsPage, 'admin');
