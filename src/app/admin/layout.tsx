'use client';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Home, Package, ShoppingCart, Users, Wallet, Building2, Settings } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const adminNavItems = [
    { href: '/admin', label: 'Panel', icon: Home, roles: ['admin', 'super-admin'] },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart, badge: '12', roles: ['admin', 'super-admin'] },
    { href: '/admin/products', label: 'Productos', icon: Package, roles: ['admin', 'super-admin'] },
    { href: '/admin/customers', label: 'Clientes', icon: Users, roles: ['admin', 'super-admin'] },
    { 
        href: '/admin/finance', 
        label: 'Finanzas', 
        icon: Wallet, 
        roles: ['admin', 'super-admin'],
        subItems: [
            { href: '/admin/finance', label: 'Gastos', roles: ['admin', 'super-admin'] },
            { href: '/admin/finance/suppliers', label: 'Proveedores', icon: Building2, roles: ['admin', 'super-admin'] },
        ]
    },
    { 
        href: '/admin/configuracion', 
        label: 'Configuración', 
        icon: Settings, 
        roles: ['super-admin'],
        subItems: [
            { href: '/admin/configuracion/unidades-de-negocio', label: 'Unidades de Negocio', roles: ['super-admin'] },
        ]
    },
]

const aiToolsNavItem = {
    href: '#',
    label: 'Herramientas IA',
    icon: Bot,
    roles: ['super-admin'],
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    user?.getIdTokenResult().then(idTokenResult => {
      const role = idTokenResult.claims.role as string || 'customer';
      setUserRole(role);
    });
  }, [user]);

  const filteredAdminNavItems = adminNavItems.filter(item => userRole && item.roles.includes(userRole));
  const canSeeAiTools = userRole && aiToolsNavItem.roles.includes(userRole);

  const getPageTitle = () => {
    for (const item of adminNavItems) {
        if (item.href === pathname) return item.label;
        if (item.subItems) {
            for (const subItem of item.subItems) {
                if (subItem.href === pathname) return subItem.label;
            }
        }
    }
    return 'Panel';
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh">
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 p-2">
                    <Icons.logo className="h-8 w-8 text-primary" />
                    <span className="font-headline text-xl font-bold tracking-tighter group-data-[collapsible=icon]:hidden">Al Chile Admin</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    {filteredAdminNavItems.map(item => (
                        <SidebarMenuItem key={item.href}>
                             <SidebarMenuButton asChild tooltip={item.label} isActive={pathname.startsWith(item.href) && (item.href !== '/admin' || pathname === '/admin')}>
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                    {item.badge && <Badge variant="destructive" className="ml-auto">{item.badge}</Badge>}
                                </Link>
                            </SidebarMenuButton>
                            {item.subItems && (
                                <SidebarMenuSub>
                                    {item.subItems.filter(sub => userRole && sub.roles.includes(sub.roles)).map(subItem => (
                                         <SidebarMenuSubItem key={subItem.href}>
                                            <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                                                <Link href={subItem.href}>{subItem.label}</Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            )}
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
                 <Separator className="my-4" />
                {canSeeAiTools && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip={aiToolsNavItem.label}>
                                    <Link href={aiToolsNavItem.href}>
                                        <aiToolsNavItem.icon />
                                        <span>{aiToolsNavItem.label}</span>
                                    </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex items-center h-14 px-4 border-b">
                <SidebarTrigger />
                <h1 className="font-headline text-xl ml-4">{getPageTitle()}</h1>
            </header>
            <main className="p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
