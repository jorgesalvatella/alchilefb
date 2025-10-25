'use client';

import { useUser } from '@/firebase/provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ComponentType } from 'react';
import { User } from 'firebase/auth';
import { AppUser } from '@/lib/types';

// --- Injected Props Definition ---
// The component wrapped by withAuth will receive these props.
export interface WithAuthProps {
  user: User;
  claims: { [key: string]: any };
}

type Role = 'user' | 'admin' | 'super_admin' | 'repartidor';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-white text-xl">Verificando permisos...</div>
  </div>
);

export function withAuth<P extends object>(WrappedComponent: ComponentType<P & WithAuthProps>, requiredRole: Role) {
  return function WithAuth(props: P) {
    const { user, userData, isUserLoading, claims } = useUser();
    const router = useRouter();
    const pathname = usePathname();

    const authCheckComplete = !isUserLoading && (user ? claims !== null : true);

    const hasPermission = () => {
      if (!authCheckComplete || !user) return false;
      if (requiredRole === 'user') return true;
      if (requiredRole === 'admin') return !!(claims?.admin || claims?.super_admin);
      if (requiredRole === 'super_admin') return !!claims?.super_admin;
      if (requiredRole === 'repartidor') return !!claims?.repartidor;
      return false;
    };

    useEffect(() => {
      if (!authCheckComplete) return;

      if (!user) {
        router.replace('/ingresar');
        return;
      }

      // Check for forced password change
      if (userData?.forcePasswordChange === true && pathname !== '/cambiar-clave') {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 [withAuth] Detected forcePasswordChange = true');
          console.log('🔐 [withAuth] userData:', userData);
          console.log('🔐 [withAuth] pathname:', pathname);
          console.log('🔐 [withAuth] Redirecting to /cambiar-clave...');
        }
        router.replace('/cambiar-clave');
        return;
      }

      if (!hasPermission()) {
        router.replace('/menu');
      }
    }, [authCheckComplete, user, userData, claims, router, pathname]);

    // CRITICAL FIX: Block component rendering if forcePasswordChange is active
    // This prevents the wrapped component from rendering before the redirect happens
    if (userData?.forcePasswordChange === true && pathname !== '/cambiar-clave') {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 [withAuth] Blocking component render due to forcePasswordChange');
      }
      return <LoadingScreen />;
    }

    if (authCheckComplete && hasPermission()) {
      // The user and claims are guaranteed to be non-null here.
      return <WrappedComponent {...props} user={user!} claims={claims!} />;
    } else {
      return <LoadingScreen />;
    }
  };
}