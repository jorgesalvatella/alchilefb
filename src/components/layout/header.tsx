'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ShoppingCart, User, Menu as MenuIcon, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth, useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const baseNavLinks = [
  { href: '/menu', label: 'Menú' },
  { href: '/orders/1', label: 'Rastrear Pedido' },
];

const adminNavLink = { href: '/admin', label: 'Admin', roles: ['admin', 'super-admin'] };


function UserNav() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />;
  }

  if (!user) {
    return (
      <Button variant="ghost" size="icon" asChild>
        <Link href="/login">
          <User />
          <span className="sr-only">Perfil</span>
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User />
          <span className="sr-only">Menú de usuario</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="font-normal">
            <p className="text-sm font-medium leading-none">Mi Cuenta</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">Mis Pedidos</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => auth.signOut()}>
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
  const { user, isUserLoading } = useUser();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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
      setUserRole('customer'); // Default role for non-logged-in users
    }
  }, [user]);

  const closeSheet = () => setSheetOpen(false);

  const getNavLinks = () => {
    let links = [...baseNavLinks];
    if (userRole && adminNavLink.roles.includes(userRole)) {
      links.push(adminNavLink);
    }
    return links;
  };
  
  const navLinks = getNavLinks();


  const navContent = (
    <nav className="flex flex-col md:flex-row items-center gap-6 text-lg md:text-sm font-medium text-foreground/80">
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={closeSheet}
          className="font-headline tracking-wide hover:text-primary transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className={cn(
        "fixed w-full top-0 z-50 transition-all duration-300",
        scrolled ? 'bg-gradient-to-r from-yellow-400/80 via-orange-500/80 to-red-600/80 backdrop-blur-lg shadow-xl' : 'bg-transparent'
    )}>
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image src="https://imagenes.nobbora.com/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(3)%20(2).png" alt="Achille Logo" width={40} height={40} />
          <span className="font-headline text-2xl font-bold tracking-tighter text-white">
            Al Chile
          </span>
        </Link>

        <div className="hidden md:flex items-center space-x-4">
            {navContent}
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
                    <SheetContent side="right" className="w-full max-w-xs pt-16">
                    <div className="flex flex-col gap-8">
                        {navContent}
                    </div>
                    </SheetContent>
                </Sheet>
            ) : (
                <div className="flex items-center gap-2">
                  <UserNav />
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/cart"><ShoppingCart /><span className="sr-only">Carrito</span></Link>
                  </Button>
                </div>
            )}
        </div>
      </nav>
    </header>
  );
}
