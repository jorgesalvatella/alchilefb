'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ShoppingCart, User, Menu as MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const navLinks = [
  { href: '/menu', label: 'Menú' },
  { href: '/orders/1', label: 'Rastrear Pedido' },
  { href: '/admin', label: 'Admin' },
];

export function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

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
                  <Button variant="ghost" size="icon" asChild onClick={closeSheet}>
                    <Link href="/login"><User /><span className="sr-only">Perfil</span></Link>
                  </Button>
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
              <Button variant="ghost" size="icon" asChild>
                <Link href="/login"><User /><span className="sr-only">Perfil</span></Link>
              </Button>
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
