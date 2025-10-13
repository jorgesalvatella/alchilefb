'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOut, Menu as MenuIcon, ShoppingCart, User } from 'lucide-react';

import { useAuth, useUser } from '@/firebase';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { adminNavigation, baseNavigation, userMenuNavigation } from '@/lib/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/cart-context';

function UserNav() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button variant="ghost" size="icon" asChild className="text-white hover:bg-fresh-green hover:text-black">
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
        <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-fresh-green hover:text-black">
          {user.photoURL ? (
            <Image src={user.photoURL} alt="User avatar" width={32} height={32} className="rounded-full" />
          ) : (
            <User />
          )}
          <span className="sr-only">Menú de usuario</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-white/10 bg-black text-white">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Mi Cuenta</p>
            <p className="text-xs leading-none text-white/60">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {userMenuNavigation.map((item) => (
          <DropdownMenuItem key={item.href} asChild className="cursor-pointer hover:bg-orange-500 hover:text-black focus:bg-orange-500 focus:text-black">
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={() => auth.signOut()} className="cursor-pointer hover:bg-orange-500 hover:text-black focus:bg-orange-500 focus:text-black">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AdminMenu({ userRole }: { userRole: string }) {
  const pathname = usePathname();
  const filteredNav = adminNavigation.filter(item => item.roles.includes(userRole as any));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn(
          "relative font-headline tracking-wider transition-colors hover:bg-fresh-green hover:text-black text-white/80 data-[state=open]:text-white",
          pathname.startsWith('/control') && "text-white"
        )}>
          Control
          {pathname.startsWith('/control') && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500"></span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-black border-white/10 text-white w-64">
        {filteredNav.map((item) => (
          item.isLabel ? (
            <DropdownMenuLabel key={item.label} className="text-white/60 text-xs px-2 py-1.5">{item.label}</DropdownMenuLabel>
          ) : (
            <DropdownMenuItem key={item.href} asChild className="hover:bg-orange-500 hover:text-black focus:bg-orange-500 focus:text-black cursor-pointer">
              <Link href={item.href}>
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          )
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { user } = useUser();
  const { itemCount } = useCart();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then(idTokenResult => {
        if (idTokenResult.claims.super_admin) {
          setUserRole('super_admin');
        } else if (idTokenResult.claims.admin) {
          setUserRole('admin');
        } else {
          setUserRole('customer');
        }
      });
    } else {
      setUserRole(null);
    }
  }, [user]);

  const closeSheet = () => setSheetOpen(false);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const DesktopNav = () => (
    <nav className="hidden md:flex items-center gap-6 text-lg md:text-base font-medium text-white/80">
      {baseNavigation.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "relative font-headline tracking-wider transition-colors hover:bg-fresh-green hover:text-black px-3 py-2 rounded-md",
              isActive && "text-white"
            )}
          >
            {link.label}
            {isActive && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500"></span>}
          </Link>
        );
      })}
      {isAdmin && userRole && <AdminMenu userRole={userRole} />}
    </nav>
  );

  const MobileNav = () => (
    <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 md:hidden">
          <MenuIcon />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-xs bg-black border-r border-r-white/10 pt-20 text-white">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <nav className="flex flex-col gap-8 text-center text-lg font-medium">
          {baseNavigation.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeSheet} className="hover:text-yellow-400">{link.label}</Link>
          ))}
          <DropdownMenuSeparator className="bg-white/10" />
          <Link href="/carrito" onClick={closeSheet} className="hover:text-yellow-400 flex items-center justify-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Carrito
          </Link>
          {user ? userMenuNavigation.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeSheet} className="hover:text-yellow-400">{link.label}</Link>
          )) : (
            <Link href="/ingresar" onClick={closeSheet} className="hover:text-yellow-400 flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                Ingresar
            </Link>
          )}
          {isAdmin && <DropdownMenuSeparator className="bg-white/10" />}
          {isAdmin && userRole && adminNavigation
            .filter(item => item.roles.includes(userRole as any))
            .map((item) => (
              item.isLabel ? (
                <h3 key={item.label} className="text-white/60 text-sm font-bold pt-4">{item.label}</h3>
              ) : (
                <Link key={item.href} href={item.href} onClick={closeSheet} className="hover:text-yellow-400 flex items-center justify-center gap-2">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              )
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className={cn(
        "fixed w-full top-0 z-50 transition-all duration-300",
        scrolled ? 'bg-gradient-to-r from-yellow-400/80 via-orange-500/80 to-red-600/80 backdrop-blur-lg shadow-xl' : 'bg-transparent'
    )}>
      <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <MobileNav />
          </div>
          <Link href="/" className="flex items-center gap-3">
            <Image src="https://imagenes.nobbora.com/Dise%C3%B1o%20sin%20t%C3%ADtulo%20(3)%20(2).png" alt="Achille Logo" width={48} height={48} className="transition-transform duration-300 hover:scale-110" />
            <span className="hidden md:inline font-black text-3xl tracking-tighter text-white">Al Chile</span>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 justify-center">
          <DesktopNav />
        </div>

        <div className="flex items-center space-x-1 md:space-x-2 text-white">
          <Button variant="ghost" size="icon" asChild className="relative text-white hover:bg-fresh-green hover:text-black">
            <Link href="/carrito">
              <ShoppingCart />
              <span className="sr-only">Carrito</span>
              {itemCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {itemCount}
                </div>
              )}
            </Link>
          </Button>
          <UserNav />
        </div>
      </div>
    </header>
  );
}