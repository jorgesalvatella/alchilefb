/**
 * Registro del Service Worker para PWA
 *
 * IMPORTANTE: Este es independiente de firebase-messaging-sw.js
 *
 * Se registra automáticamente en producción
 * En desarrollo, no se registra para evitar interferencias
 */

export async function registerServiceWorker() {
  // Solo registrar en producción y si el navegador soporta SW
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    process.env.NODE_ENV !== 'production'
  ) {
    console.log('[PWA] Service Worker not registered (not in production or not supported)');
    return;
  }

  try {
    // Esperar a que la página cargue completamente
    if (document.readyState === 'loading') {
      await new Promise((resolve) => {
        window.addEventListener('load', resolve);
      });
    }

    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered successfully:', registration.scope);

    // Manejar actualizaciones del SW
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Hay una nueva versión del SW disponible
            console.log('[PWA] New Service Worker available');

            // Opcional: mostrar notificación al usuario
            if (window.confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Manejar cuando el SW toma control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

/**
 * Verificar si hay una actualización disponible
 */
export async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('[PWA] Checked for Service Worker updates');
    }
  } catch (error) {
    console.error('[PWA] Error checking for updates:', error);
  }
}

/**
 * Desregistrar el Service Worker (útil para debugging)
 */
export async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('[PWA] Service Worker unregistered');
    }
  } catch (error) {
    console.error('[PWA] Error unregistering Service Worker:', error);
  }
}
