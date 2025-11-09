'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Banner profesional de actualización de PWA
 *
 * UX mejorada:
 * - No intrusivo (banner inferior)
 * - Personalizable y bonito
 * - Opción "Más tarde"
 * - Respeta páginas críticas (no mostrar en checkout)
 * - Persistencia de preferencias
 */

const CRITICAL_ROUTES = ['/pago', '/carrito', '/verificar-telefono'];
const SNOOZE_HOURS = 24; // No molestar por 24 horas si dice "Más tarde"

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Solo en producción y si soporta SW
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV !== 'production'
    ) {
      return;
    }

    const checkForUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        // Guardar la registration para usarla después
        setRegistration(reg);

        // Detectar cuando hay una actualización disponible
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                handleUpdateAvailable();
              }
            });
          }
        });

        // Verificar si hay actualización pendiente
        await reg.update();
      } catch (error) {
        console.error('[UpdatePrompt] Error checking for updates:', error);
      }
    };

    checkForUpdate();
  }, []);

  const handleUpdateAvailable = () => {
    // Verificar si ya se mostró recientemente
    const snoozedUntil = localStorage.getItem('pwa-update-snoozed');
    if (snoozedUntil) {
      const snoozedDate = new Date(snoozedUntil);
      if (snoozedDate > new Date()) {
        console.log('[UpdatePrompt] Update snoozed until', snoozedDate);
        return;
      }
    }

    // No mostrar en rutas críticas
    const currentPath = window.location.pathname;
    const isOnCriticalRoute = CRITICAL_ROUTES.some((route) =>
      currentPath.startsWith(route)
    );

    if (isOnCriticalRoute) {
      console.log('[UpdatePrompt] On critical route, delaying update prompt');
      // Reintentar en 30 segundos cuando el usuario navegue
      setTimeout(handleUpdateAvailable, 30000);
      return;
    }

    // Mostrar el banner
    setShowPrompt(true);
  };

  const handleUpdate = async () => {
    if (!registration || !registration.waiting) {
      console.error('[UpdatePrompt] No waiting service worker');
      return;
    }

    setIsUpdating(true);

    try {
      // Enviar mensaje al SW para que active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Escuchar cuando el nuevo SW tome control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Limpiar flags antes de recargar
        localStorage.removeItem('pwa-update-snoozed');
        sessionStorage.removeItem('sw-update-prompted');

        // Recargar la página para usar la nueva versión
        window.location.reload();
      });
    } catch (error) {
      console.error('[UpdatePrompt] Error updating:', error);
      setIsUpdating(false);
    }
  };

  const handleSnooze = () => {
    // Guardar en localStorage para no molestar por X horas
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + SNOOZE_HOURS);
    localStorage.setItem('pwa-update-snoozed', snoozeUntil.toISOString());

    setShowPrompt(false);
    console.log('[UpdatePrompt] Update snoozed until', snoozeUntil);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // No guardar en localStorage, se mostrará de nuevo si recarga
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up">
      <div className="max-w-md mx-auto bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-2xl p-4 relative">
        {/* Botón cerrar (X) */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white transition-colors"
          aria-label="Cerrar"
          disabled={isUpdating}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* Icono */}
          <div className="flex-shrink-0 bg-white/10 p-2 rounded-full">
            <RefreshCw
              className={`h-6 w-6 text-white ${isUpdating ? 'animate-spin' : ''}`}
            />
          </div>

          {/* Contenido */}
          <div className="flex-1">
            <h3 className="text-white font-bold text-base mb-1">
              {isUpdating ? 'Actualizando...' : 'Nueva versión disponible'}
            </h3>
            <p className="text-white/90 text-sm mb-3">
              {isUpdating
                ? 'Instalando la última versión de Al Chile'
                : 'Hay mejoras y correcciones esperándote'}
            </p>

            {/* Botones */}
            {!isUpdating && (
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdate}
                  className="bg-white text-orange-600 hover:bg-gray-100 font-semibold text-sm h-9 flex-1"
                >
                  Actualizar ahora
                </Button>
                <Button
                  onClick={handleSnooze}
                  variant="ghost"
                  className="text-white hover:bg-white/10 font-semibold text-sm h-9"
                >
                  Más tarde
                </Button>
              </div>
            )}

            {isUpdating && (
              <div className="bg-white/20 rounded-full h-1 overflow-hidden">
                <div className="bg-white h-full w-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
