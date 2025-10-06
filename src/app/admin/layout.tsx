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
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Home, Package, ShoppingCart, Users, Wallet } from 'lucide-react';
import { useUser } from '@/firebase/provider';
import { useEffect, useState } from 'react';

const adminNavItems = [
    { href: '/admin', label: 'Panel', icon: Home, roles: ['admin', 'super-admin'] },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart, badge: '12', roles: ['admin', 'super-admin'] },
    { href: '/admin/products', label: 'Productos', icon: Package, roles: ['admin', 'super-admin'] },
    { href: '/admin/customers', label: 'Clientes', icon: Users, roles: ['admin', 'super-admin'] },
    { href: '/admin/finance', label: 'Finanzas', icon: Wallet, roles: ['admin', 'super-admin'] },
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

  useEffect(() => {
    user?.getIdTokenResult().then(idTokenResult => {
      const role = idTokenResult.claims.role as string || 'customer';
      setUserRole(role);
    });
  }, [user]);

  const filteredAdminNavItems = adminNavItems.filter(item => userRole && item.roles.includes(userRole));
  const canSeeAiTools = userRole && aiToolsNavItem.roles.includes(userRole);

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
                            <SidebarMenuButton asChild tooltip={item.label}>
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                    {item.badge && <Badge variant="destructive" className="ml-auto">{item.badge}</Badge>}
                                </Link>
                            </SidebarMenuButton>
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
                <h1 className="font-headline text-xl ml-4">Panel</h1>
            </header>
            <main className="p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
