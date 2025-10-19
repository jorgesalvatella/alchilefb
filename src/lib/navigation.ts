import {
  Home,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Building2,
  Settings,
  Bot,
  Tag,
  Truck,
  LucideIcon
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  roles: Array<'super_admin' | 'admin' | 'customer'>;
  isLabel?: boolean;
};

export const adminNavigation: NavItem[] = [
  {
    href: '/control',
    label: 'Panel Principal',
    icon: Home,
    roles: ['admin', 'super_admin'],
  },
  {
    isLabel: true,
    label: 'Gestión',
    href: '#gestion', // href needed for key, but it's a label
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/pedidos',
    label: 'Pedidos',
    icon: ShoppingCart,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/productos-venta',
    label: 'Productos de Venta',
    icon: Package,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/promociones',
    label: 'Paquetes y Promociones',
    icon: Tag,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/clientes',
    label: 'Clientes',
    icon: Users,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/repartidores',
    label: 'Repartidores',
    icon: Truck,
    roles: ['admin', 'super_admin'],
  },
  {
    isLabel: true,
    label: 'Finanzas',
    href: '#finanzas',
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/finanzas',
    label: 'Gastos',
    icon: Wallet,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/control/finanzas/proveedores',
    label: 'Proveedores',
    icon: Building2,
    roles: ['admin', 'super_admin'],
  },
  {
    isLabel: true,
    label: 'Configuración Avanzada',
    href: '#config',
    roles: ['super_admin'],
  },
  {
    href: '/control/catalogo',
    label: 'Catálogo de Gastos',
    icon: Settings,
    roles: ['super_admin'],
  },
];

export const baseNavigation: NavItem[] = [
    { href: '/menu', label: 'Menú', roles: ['customer', 'admin', 'super_admin'] },
];

export const userMenuNavigation: NavItem[] = [
    { href: '/perfil', label: 'Perfil', roles: ['customer', 'admin', 'super_admin'] },
    { href: '/mis-pedidos', label: 'Mis Pedidos', roles: ['customer', 'admin', 'super_admin'] },
];
