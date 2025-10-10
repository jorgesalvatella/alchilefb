'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ShoppingCart, User, Menu as MenuIcon, LogOut, Home, Package, Users, Wallet, Building2, Settings, Bot } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth, useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const baseNavLinks = [
  { href: '/menu', label: 'Menú' },
];

const adminNavItems = [
    { href: '/control', label: 'Panel', icon: Home, roles: ['admin', 'super-admin'] },
    { href: '/control/pedidos', label: 'Pedidos', icon: ShoppingCart, roles: ['admin', 'super-admin'] },
    { href: '/control/productos', label: 'Productos', icon: Package, roles: ['admin', 'super-admin'] },
    { href: '/control/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'super-admin'] },
    { 
        href: '/control/finanzas', 
        label: 'Finanzas', 
        icon: Wallet, 
        roles: ['admin', 'super-admin'],
        subItems: [
            { href: '/control/finanzas', label: 'Gastos', roles: ['admin', 'super-admin'] },
            { href: '/control/finanzas/proveedores', label: 'Proveedores', roles: ['admin', 'super-admin'] },
        ]
    },
    { 
        href: '/control/catalogo', 
        label: 'Catálogo', 
        icon: Settings, 
        roles: ['super-admin'],
        subItems: [
            { href: '/control/catalogo/unidades-de-negocio', label: 'Unidades de Negocio', roles: ['super-admin'] },
        ]
    },
]

const aiToolsNavItem = {
    href: '#',
    label: 'Herramientas IA',
    icon: Bot,
    roles: ['super-admin'],
}

function UserNav() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />;
  }

  if (!user) {
    return (
      <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
        <Link href="/ingresar">
          <User />
          <span className="sr-only">Perfil</span>
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
          {user.photoURL ? (
            <Image src={user.photoURL} alt="User avatar" width={32} height={32} className="rounded-full" />
          ) : (
            <User />
          )}
          <span className="sr-only">Menú de usuario</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-black/80 backdrop-blur-lg border-white/10 text-white w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Mi Cuenta</p>
            <p className="text-xs leading-none text-white/60">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
          <Link href="/perfil">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
          <Link href="/mis-pedidos">Mis Pedidos</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={() => auth.signOut()} className="hover:bg-white/10 focus:bg-red-600/50 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then(idTokenResult => {
        const role = idTokenResult.claims.role as string || 'customer';
        setUserRole(role);
      });
    } else {
      setUserRole('customer');
    }
  }, [user]);

  const closeSheet = () => setSheetOpen(false);

  const getNavLinks = () => {
    let links = [...baseNavLinks];
    if (user) {
      links.push({ href: '/mis-pedidos', label: 'Mis Pedidos' });
    }
    return links;
  };

  const isAdmin = userRole === 'admin' || userRole === 'super-admin';

  const navContent = (isMobile: boolean) => (
    <nav className={cn("flex items-center gap-6 text-lg md:text-base font-medium text-white/80", isMobile && "flex-col text-center")}>
      {getNavLinks().map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeSheet}
            className={cn(
              "relative font-headline tracking-wider transition-colors hover:text-white",
              isActive && "text-white"
            )}
          >
            {link.label}
            {isActive && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500"></span>}
          </Link>
        );
      })}
      {isAdmin && (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative font-headline tracking-wider transition-colors hover:text-white text-white/80 data-[state=open]:text-white">
                    Control
                    {pathname.startsWith('/control') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500"></span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-black/80 backdrop-blur-lg border-white/10 text-white w-56">
                {adminNavItems.map(item => (
                    item.subItems ? (
                        <DropdownMenuSub key={item.href}>
                            <DropdownMenuSubTrigger className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                <item.icon className="mr-2 h-4 w-4" />
                                <span>{item.label}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="bg-black/80 backdrop-blur-lg border-white/10 text-white">
                                    {item.subItems.map(subItem => (
                                        <DropdownMenuItem key={subItem.href} asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                            <Link href={subItem.href}>{subItem.label}</Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    ) : (
                        <DropdownMenuItem key={item.href} asChild className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                            <Link href={item.href}>
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Link>
                        </DropdownMenuItem>
                    )
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );

  return (
    <header className={cn(
        "fixed w-full top-0 z-50 transition-all duration-300",
        scrolled ? 'bg-gradient-to-r from-yellow-400/80 via-orange-500/80 to-red-600/80 backdrop-blur-lg shadow-xl' : 'bg-transparent'
    )}>
      <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <Image src="https://imagenes.nobbora.com/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(3)%20(2).png" alt="Achille Logo" width={48} height={48} className="transition-transform duration-300 hover:scale-110" />
          <span className="font-black text-3xl tracking-tighter text-white">
            Al Chile
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-8">
            {navContent(false)}
        </div>

        <div className="flex items-center space-x-2">
             {isMobile ? (
                <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <MenuIcon />
                        <span className="sr-only">Abrir menú</span>
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full max-w-xs bg-black/80 backdrop-blur-lg border-l-0 pt-20 text-white overflow-hidden">
                      <h2 className="sr-only">Menu</h2>
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-600/20"></div>
                      <div className="absolute top-20 left-10 w-72 h-72 bg-chile-red rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                      <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                      <div className="relative flex flex-col justify-between h-full">
                        <div className="flex flex-col gap-8 text-center">
                            {navContent(true)}
                        </div>
                        <div className="border-t border-white/10 pt-6 flex justify-center items-center gap-4">
                          <UserNav />
                          <Button variant="ghost" size="icon" asChild className="relative text-white hover:bg-white/10">
                            <Link href="/carrito">
                              <ShoppingCart />
                              <span className="sr-only">Carrito</span>
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                                3
                              </div>
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <div className="flex items-center gap-2 text-white">
                  <UserNav />
                  <Button variant="ghost" size="icon" asChild className="relative text-white hover:bg-white/10">
                    <Link href="/carrito">
                      <ShoppingCart />
                      <span className="sr-only">Carrito</span>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                    </Link>
                  </Button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
}