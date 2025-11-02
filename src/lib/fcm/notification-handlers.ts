/**
 * Manejadores de Notificaciones FCM
 *
 * Este módulo configura los listeners para notificaciones en foreground
 * y proporciona funciones para mostrar notificaciones como toasts.
 */

'use client';

import { Messaging } from 'firebase/messaging';
import { onForegroundMessage } from './firebase-messaging';
import { toast } from 'sonner';

/**
 * Payload de notificación FCM que llega del backend
 */
interface FCMNotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
  data?: {
    click_action?: string;
    orderId?: string;
    type?: string;
    [key: string]: any;
  };
}

/**
 * Reproduce un sonido de notificación
 *
 * NOTA: Solo funciona si el usuario ya ha interactuado con la página
 * (requisito de autoplay de navegadores modernos)
 */
const playNotificationSound = () => {
  try {
    // Crear un beep simple usando Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frecuencia del beep (Hz)
    oscillator.type = 'sine';

    gainNode.gain.value = 0.3; // Volumen (0-1)

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2); // Duración 200ms
  } catch (error) {
    console.warn('[Notifications] No se pudo reproducir sonido:', error);
    // Fallar silenciosamente - el sonido es opcional
  }
};

/**
 * Muestra una notificación como toast (foreground)
 *
 * @param payload - Payload de la notificación FCM
 */
const showNotificationToast = (payload: FCMNotificationPayload) => {
  const title = payload.notification?.title || 'Nueva notificación';
  const body = payload.notification?.body || '';
  const clickAction = payload.data?.click_action;

  // Reproducir sonido
  playNotificationSound();

  // Mostrar toast con acción de click opcional
  if (clickAction) {
    toast.info(title, {
      description: body,
      duration: 5000,
      action: {
        label: 'Ver',
        onClick: () => {
          // Navegar a la URL especificada
          window.location.href = clickAction;
        }
      }
    });
  } else {
    toast.info(title, {
      description: body,
      duration: 4000
    });
  }
};

/**
 * Configura el listener de notificaciones en foreground
 *
 * Debe llamarse una vez cuando la app se monta (en el layout o component principal)
 *
 * @param messaging - Instancia de Firebase Messaging
 * @returns Función para desuscribirse
 */
export const setupForegroundNotifications = (messaging: Messaging): (() => void) => {
  console.log('[Notifications] Configurando listener de foreground');

  const unsubscribe = onForegroundMessage(messaging, (payload: FCMNotificationPayload) => {
    console.log('[Notifications] Notificación recibida en foreground:', payload);

    // Mostrar como toast
    showNotificationToast(payload);

    // TODO FASE 4B: Actualizar badge/contador en header
    // incrementNotificationBadge();

    // TODO FASE 4B: Agregar a historial de notificaciones
    // addToNotificationHistory(payload);
  });

  return unsubscribe;
};

/**
 * Configura el listener para mensajes del Service Worker
 *
 * Cuando el usuario hace click en una notificación en background,
 * el Service Worker puede enviar un mensaje a la app para navegar.
 */
export const setupServiceWorkerMessageListener = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('[Notifications] Mensaje del Service Worker:', event.data);

    if (event.data.type === 'NOTIFICATION_CLICK') {
      const { url } = event.data;

      // Navegar a la URL
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    }
  });
};

/**
 * Helper: Obtener el icono apropiado según el tipo de notificación
 *
 * @param type - Tipo de notificación (order.created, driver.assigned, etc.)
 * @returns Ruta al icono
 */
export const getNotificationIcon = (type?: string): string => {
  if (!type) {
    return '/icons/icon-192x192.svg';
  }

  // Mapear tipos a iconos específicos (si tienes iconos personalizados)
  const iconMap: Record<string, string> = {
    'order.created': '/icons/icon-192x192.svg',
    'order.preparing': '/icons/icon-192x192.svg',
    'order.driver_assigned': '/icons/icon-192x192.svg',
    'order.in_delivery': '/icons/icon-192x192.svg',
    'order.delivered': '/icons/icon-192x192.svg',
    'order.cancelled': '/icons/icon-192x192.svg',
    'driver.order_assigned': '/icons/icon-192x192.svg',
    'admin.new_order': '/icons/icon-192x192.svg'
  };

  return iconMap[type] || '/icons/icon-192x192.svg';
};
