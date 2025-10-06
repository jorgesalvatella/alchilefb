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
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth, useUser } from '@/firebase';

const navLinks = [
  { href: '/menu', label: 'Menú' },
  { href: '/orders/1', label: 'Rastrear Pedido' },
  { href: '/admin', label: 'Admin' },
];

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

  const closeSheet = () => setSheetOpen(false);

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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={closeSheet}>
          <Icons.logo className="h-8 w-8" />
          <span className="font-headline text-2xl font-bold tracking-tighter">
            Al Chile
          </span>
        </Link>

        {isMobile ? (
          <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs pt-16">
              <div className="flex flex-col gap-8">
                {navContent}
                <div className="flex items-center gap-2">
                  <div onClick={closeSheet}>
                    <UserNav />
                  </div>
                  <Button variant="ghost" size="icon" asChild onClick={closeSheet}>
                    <Link href="/cart"><ShoppingCart /><span className="sr-only">Carrito</span></Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <div className="flex items-center gap-6">
            {navContent}
            <div className="flex items-center gap-2">
              <UserNav />
              <Button variant="ghost" size="icon" asChild>
                <Link href="/cart"><ShoppingCart /><span className="sr-only">Carrito</span></Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
