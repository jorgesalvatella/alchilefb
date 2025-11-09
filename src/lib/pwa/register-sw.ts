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

            // Guardar en sessionStorage que el usuario ya aceptó actualizar
            // Esto evita mostrar el prompt múltiples veces
            const alreadyPrompted = sessionStorage.getItem('sw-update-prompted');

            if (!alreadyPrompted) {
              sessionStorage.setItem('sw-update-prompted', 'true');

              if (window.confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
                // Marcar que vamos a recargar para evitar bucle
                sessionStorage.setItem('sw-update-accepted', 'true');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                // El reload lo hará el evento 'controllerchange'
              }
            }
          }
        });
      }
    });

    // Manejar cuando el SW toma control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Solo recargar si el usuario aceptó la actualización
      const updateAccepted = sessionStorage.getItem('sw-update-accepted');

      if (!refreshing && updateAccepted) {
        refreshing = true;
        sessionStorage.removeItem('sw-update-prompted');
        sessionStorage.removeItem('sw-update-accepted');
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
