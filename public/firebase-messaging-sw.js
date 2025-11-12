// ============================================================================
// Firebase Cloud Messaging Service Worker
// ============================================================================
// Este Service Worker maneja las notificaciones push de Firebase cuando
// la aplicación está en background (usuario no está viendo la pestaña).
//
// IMPORTANTE:
// - Este archivo DEBE estar en /public/ para ser accesible en la raíz
// - NO puede usar imports ES6, solo importScripts()
// - Se ejecuta en un contexto separado del main thread
// ============================================================================

// Importar Firebase scripts (versión 10.x compatible)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración de Firebase (debe coincidir con src/firebase/config.ts)
const firebaseConfig = {
  projectId: "studio-9824031244-700aa",
  appId: "1:1073493631859:web:d747356460c06013eb5b06",
  apiKey: "AIzaSyCetC4ZTnHKQa2Pm_YWfhoMCbYqdaGTqQc",
  authDomain: "studio-9824031244-700aa.firebaseapp.com",
  messagingSenderId: "1073493631859"
};

// Inicializar Firebase en el Service Worker
firebase.initializeApp(firebaseConfig);

// Obtener instancia de Firebase Messaging
const messaging = firebase.messaging();

// ============================================================================
// MANEJO DE NOTIFICACIONES EN BACKGROUND
// ============================================================================

/**
 * Este evento se dispara cuando llega una notificación push mientras
 * la app está en background (pestaña no visible/cerrada).
 *
 * El payload viene del backend en este formato:
 * {
 *   notification: {
 *     title: "Título",
 *     body: "Mensaje",
 *     icon: "/icon-192x192.png"
 *   },
 *   data: {
 *     click_action: "/ruta/a/navegar",
 *     orderId: "123",
 *     type: "order.created"
 *   }
 * }
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación recibida en background:', payload);

  // Extraer datos del payload
  const notificationTitle = payload.notification?.title || 'Al Chile FB';
  const notificationOptions = {
    body: payload.notification?.body || 'Tienes una nueva notificación',
    icon: payload.notification?.icon || '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    vibrate: [200, 100, 200], // Patrón de vibración (Android)
    tag: payload.data?.type || 'notification', // Agrupa notificaciones del mismo tipo
    requireInteraction: false, // No requiere interacción para cerrarse
    silent: false, // ⚠️ IMPORTANTE: false = reproduce sonido del sistema
    sound: 'default', // Sonido por defecto del sistema
    data: {
      // Guardar datos custom para usar en el click
      click_action: payload.data?.click_action || '/',
      orderId: payload.data?.orderId,
      type: payload.data?.type,
      timestamp: Date.now()
    }
  };

  // Mostrar la notificación
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================================================
// MANEJO DE CLICK EN NOTIFICACIONES
// ============================================================================

/**
 * Este evento se dispara cuando el usuario hace click en una notificación.
 *
 * Estrategia: "Focus pestaña existente + navegar"
 * 1. Si hay una pestaña de la app abierta → hace focus + navega
 * 2. Si no hay pestaña abierta → abre nueva pestaña en la URL
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Click en notificación:', event.notification);

  // Cerrar la notificación
  event.notification.close();

  // Obtener la URL de destino
  const urlToOpen = event.notification.data?.click_action || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  // Esperar a que se complete la acción
  event.waitUntil(
    // Obtener todas las pestañas abiertas del cliente
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      // Buscar si ya hay una pestaña de la app abierta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];

        // Si encontramos una pestaña de nuestro origin
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          // ESTRATEGIA: Focus + Navigate
          console.log('[firebase-messaging-sw.js] Pestaña existente encontrada, haciendo focus');

          // Hacer focus en la pestaña
          return client.focus().then((focusedClient) => {
            // Navegar a la URL de destino
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(fullUrl);
            } else {
              // Fallback: enviar mensaje para que la app navegue
              focusedClient.postMessage({
                type: 'NOTIFICATION_CLICK',
                url: urlToOpen,
                data: event.notification.data
              });
            }
          });
        }
      }

      // Si no hay pestaña abierta, abrir nueva
      console.log('[firebase-messaging-sw.js] No hay pestaña abierta, abriendo nueva');
      return clients.openWindow(fullUrl);
    })
    .catch((error) => {
      console.error('[firebase-messaging-sw.js] Error al manejar click:', error);
      // Fallback: abrir nueva pestaña si algo falla
      return clients.openWindow(fullUrl);
    })
  );

  // Actualizar estadísticas (opcional)
  // El backend puede trackear clicks si enviamos un fetch aquí
  // fetch('/api/fcm/track-click', { method: 'POST', body: JSON.stringify({ notificationId: event.notification.tag }) });
});

// ============================================================================
// EVENTOS DE SERVICE WORKER (Opcional - Debugging)
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker instalado');
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activado');
  // Tomar control de todos los clientes inmediatamente
  event.waitUntil(clients.claim());
});
