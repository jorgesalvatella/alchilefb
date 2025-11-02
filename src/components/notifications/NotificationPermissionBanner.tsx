/**
 * Componente: NotificationPermissionBanner
 *
 * Banner inferior que solicita permisos de notificaciones SOLO LA PRIMERA VEZ.
 *
 * Comportamiento:
 * - Aparece automáticamente al hacer login (solo primera vez)
 * - Se puede cerrar sin activar
 * - No vuelve a aparecer si el usuario ya respondió (granted/denied)
 * - Guarda en localStorage que ya se mostró
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import { useFCMToken } from '@/hooks/use-fcm-token';
import { requestNotificationPermission } from '@/lib/fcm/firebase-messaging';
import { toast } from 'sonner';

const STORAGE_KEY = 'fcm-permission-prompt-shown';

export const NotificationPermissionBanner = () => {
  const { user, isUserLoading } = useUser();
  const { permission, isSupported, registerToken } = useFCMToken();

  const [isVisible, setIsVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * Determinar si debe mostrarse el banner
   */
  useEffect(() => {
    // Esperar a que cargue el usuario
    if (isUserLoading) {
      return;
    }

    // Solo mostrar si:
    // 1. Hay usuario autenticado
    // 2. Navegador soporta notificaciones
    // 3. Permisos están en 'default' (no ha respondido)
    // 4. No se ha mostrado antes (localStorage)

    if (!user) {
      setIsVisible(false);
      return;
    }

    if (!isSupported) {
      setIsVisible(false);
      return;
    }

    if (permission !== 'default') {
      // Ya respondió (granted o denied), no mostrar
      setIsVisible(false);
      return;
    }

    // Verificar si ya se mostró antes
    const hasShownBefore = localStorage.getItem(STORAGE_KEY);
    if (hasShownBefore === 'true') {
      setIsVisible(false);
      return;
    }

    // Todas las condiciones se cumplen, mostrar banner
    setIsVisible(true);
  }, [user, isUserLoading, isSupported, permission]);

  /**
   * Manejar el click en "Activar"
   */
  const handleActivate = async () => {
    setIsRequesting(true);

    try {
      // 1. Solicitar permisos
      const result = await requestNotificationPermission();

      // 2. Marcar como mostrado (no volver a mostrar)
      localStorage.setItem(STORAGE_KEY, 'true');

      if (result === 'granted') {
        // 3. Permisos otorgados: registrar token
        toast.success('¡Notificaciones activadas!', {
          description: 'Recibirás actualizaciones de tus pedidos en tiempo real'
        });

        // El hook useFCMToken se encargará de registrar el token automáticamente
        // al detectar el cambio de permission
        await registerToken();

        setIsVisible(false);
      } else if (result === 'denied') {
        // Permisos denegados
        toast.error('Notificaciones desactivadas', {
          description: 'Puedes activarlas más tarde desde tu perfil o configuración del navegador'
        });
        setIsVisible(false);
      } else {
        // default (raro caso, el usuario cerró el prompt sin responder)
        toast.info('No se activaron las notificaciones', {
          description: 'Puedes activarlas cuando quieras desde tu perfil'
        });
        setIsVisible(false);
      }
    } catch (error) {
      console.error('[Banner] Error al solicitar permisos:', error);
      toast.error('Error al activar notificaciones', {
        description: 'Intenta de nuevo más tarde'
      });
    } finally {
      setIsRequesting(false);
    }
  };

  /**
   * Manejar el click en "Cerrar" (X)
   */
  const handleDismiss = () => {
    // Marcar como mostrado para no volver a aparecer
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);

    toast.info('Notificaciones desactivadas', {
      description: 'Puedes activarlas cuando quieras desde tu perfil'
    });
  };

  // No renderizar si no es visible
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Icono + Mensaje */}
          <div className="flex items-center gap-3 flex-1">
            <Bell className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                ¿Quieres recibir notificaciones de tus pedidos?
              </p>
              <p className="text-xs text-blue-100 hidden sm:block">
                Te avisaremos cuando tu pedido cambie de estado
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleActivate}
              disabled={isRequesting}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              {isRequesting ? 'Activando...' : 'Activar'}
            </Button>

            <button
              onClick={handleDismiss}
              disabled={isRequesting}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
