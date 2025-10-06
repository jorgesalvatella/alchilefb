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
import { Bot, Home, Package, ShoppingCart, Users } from 'lucide-react';

const adminNavItems = [
    { href: '/admin', label: 'Panel', icon: Home },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart, badge: '12' },
    { href: '/admin/products', label: 'Productos', icon: Package },
    { href: '/admin/customers', label: 'Clientes', icon: Users },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
                    {adminNavItems.map(item => (
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
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Herramientas de IA">
                                <Link href="#">
                                    <Bot />
                                    <span>Herramientas IA</span>
                                </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
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
