'use client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { AppUser } from '@/lib/data';
import { Users, UserCog, Shield, UserX, CheckCircle, XCircle, Pen, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EditUserDialog } from '@/components/control/edit-user-dialog';
import { Breadcrumbs } from '@/components/ui/breadcrumb';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export function AdminUsersPageContent({ user, claims }: WithAuthProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sucursalFilter, setSucursalFilter] = useState<string>('');

  // Determine if current user is super_admin
  const isSuperAdmin = !!claims?.super_admin;

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
        let url = '/api/control/usuarios';

        // Build query params
        const params = new URLSearchParams();
        if (roleFilter !== 'all') {
          params.append('role', roleFilter);
        }
        if (activeFilter !== 'all') {
          params.append('active', activeFilter);
        }
        if (sucursalFilter.trim()) {
          params.append('sucursalId', sucursalFilter.trim());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo obtener los usuarios.');
        const data = await response.json();
        setUsers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, roleFilter, activeFilter, sucursalFilter]);

  const handleEdit = (item: AppUser) => {
    setSelectedUser(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.')) return;

    if (!isSuperAdmin) {
      alert('Solo Super Admin puede eliminar usuarios.');
      return;
    }

    try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/usuarios/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('No se pudo eliminar el usuario.');
        window.location.reload();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: any, className: string }> = {
      usuario: { variant: 'outline', icon: Users, className: 'border-white/40 text-white/80' },
      repartidor: { variant: 'default', icon: UserCog, className: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
      admin: { variant: 'default', icon: Shield, className: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
      super_admin: { variant: 'default', icon: Shield, className: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    };
    const config = variants[role] || variants.usuario;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {role === 'usuario' && 'Usuario'}
        {role === 'repartidor' && 'Repartidor'}
        {role === 'admin' && 'Admin'}
        {role === 'super_admin' && 'Super Admin'}
      </Badge>
    );
  };

  const getActiveBadge = (active: boolean) => {
    if (active) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500/20 text-green-300 border-green-500/40">
          <CheckCircle className="h-3 w-3" />
          Activo
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1 bg-red-500/20 text-red-300 border-red-500/40">
        <XCircle className="h-3 w-3" />
        Inactivo
      </Badge>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const breadcrumbItems = [
    { label: 'Control', href: '/control' },
    { label: 'Usuarios', href: '/control/usuarios' },
  ];

  return (
    <div className="pt-32">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="text-center mb-12">
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Usuarios
          </span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full md:w-auto">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent className="bg-black/80 text-white border-white/20">
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="usuario">Usuario</SelectItem>
              <SelectItem value="repartidor">Repartidor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-black/80 text-white border-white/20">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar por sucursal..."
            value={sucursalFilter}
            onChange={(e) => setSucursalFilter(e.target.value)}
            className="w-full md:w-[200px] bg-white/5 border-white/20 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          <p className="text-center text-white/60 py-12">Cargando...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-12">Error: {error}</p>
        ) : (
          users.map((userData) => (
            <Card key={userData.id} className="bg-black/50 backdrop-blur-sm border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center justify-between">
                  <span>{userData.email}</span>
                  {getActiveBadge(userData.active)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div><span className="font-semibold">Nombre:</span> {userData.displayName || 'N/A'}</div>
                <div><span className="font-semibold">Teléfono:</span> {userData.phoneNumber || 'N/A'}</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Rol:</span> {getRoleBadge(userData.role)}
                </div>
                <div><span className="font-semibold">Sucursal:</span> {userData.sucursalId || 'N/A'}</div>
                <div><span className="font-semibold">Departamento:</span> {userData.departamento || 'N/A'}</div>
                <div><span className="font-semibold">Último acceso:</span> {formatDate(userData.lastLogin)}</div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(userData)} className="text-white/60 hover:text-orange-400">
                  <Pen className="h-4 w-4" />
                </Button>
                {isSuperAdmin && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(userData.id)} className="text-white/60 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
              <TableHead className="text-white/80">Email</TableHead>
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-white/80">Teléfono</TableHead>
              <TableHead className="text-white/80">Rol</TableHead>
              <TableHead className="text-white/80">Estado</TableHead>
              <TableHead className="text-white/80">Sucursal</TableHead>
              <TableHead className="text-white/80">Departamento</TableHead>
              <TableHead className="text-white/80">Último Acceso</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-white/60 py-12">Cargando...</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={9} className="text-center text-red-500 py-12">Error: {error}</TableCell></TableRow>
            ) : users.map((userData) => (
              <TableRow key={userData.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white text-sm">{userData.email}</TableCell>
                <TableCell className="text-white/80">{userData.displayName || 'N/A'}</TableCell>
                <TableCell className="text-white/80 text-sm">{userData.phoneNumber || 'N/A'}</TableCell>
                <TableCell>{getRoleBadge(userData.role)}</TableCell>
                <TableCell>{getActiveBadge(userData.active)}</TableCell>
                <TableCell className="text-white/80 text-sm">{userData.sucursalId || 'N/A'}</TableCell>
                <TableCell className="text-white/80 text-sm">{userData.departamento || 'N/A'}</TableCell>
                <TableCell className="text-white/80 text-xs">{formatDate(userData.lastLogin)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(userData)} className="text-white/60 hover:text-orange-400" title="Editar">
                    <Pen className="h-4 w-4" />
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(userData.id)} className="text-white/60 hover:text-red-500" title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditUserDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        userData={selectedUser}
      />
    </div>
  );
}

export default withAuth(AdminUsersPageContent, 'admin');
