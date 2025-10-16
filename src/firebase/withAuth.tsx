'use client';

import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { useEffect, ComponentType } from 'react';
import { User } from 'firebase/auth';

// --- Injected Props Definition ---
// The component wrapped by withAuth will receive these props.
export interface WithAuthProps {
  user: User;
  claims: { [key: string]: any };
}

type Role = 'user' | 'admin' | 'super_admin';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-white text-xl">Verificando permisos...</div>
  </div>
);

export function withAuth<P extends object>(WrappedComponent: ComponentType<P & WithAuthProps>, requiredRole: Role) {
  return function WithAuth(props: P) {
    const { user, isUserLoading, claims } = useUser();
    const router = useRouter();

    const authCheckComplete = !isUserLoading && (user ? claims !== null : true);

    const hasPermission = () => {
      if (!authCheckComplete || !user) return false;
      if (requiredRole === 'user') return true;
      if (requiredRole === 'admin') return !!(claims?.admin || claims?.super_admin);
      if (requiredRole === 'super_admin') return !!claims?.super_admin;
      return false;
    };

    useEffect(() => {
      if (!authCheckComplete) return;

      if (!user) {
        router.replace('/ingresar');
        return;
      }

      if (!hasPermission()) {
        router.replace('/menu');
      }
    }, [authCheckComplete, user, claims, router]);

    if (authCheckComplete && hasPermission()) {
      // The user and claims are guaranteed to be non-null here.
      return <WrappedComponent {...props} user={user!} claims={claims!} />;
    } else {
      return <LoadingScreen />;
    }
  };
}