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
import { playCashRegisterSound } from '@/utils/cash-register-sound';

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
 * Reproduce un beep genérico
 */
const playGenericBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);

    setTimeout(() => audioContext.close(), 300);
  } catch (error) {
    console.warn('[Notifications] No se pudo reproducir sonido:', error);
  }
};

/**
 * Reproduce un sonido de éxito (campana)
 */
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200; // Más agudo para sonido de éxito
    oscillator.type = 'sine';
    gainNode.gain.value = 0.25;

    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);

    setTimeout(() => audioContext.close(), 500);
  } catch (error) {
    console.warn('[Notifications] No se pudo reproducir sonido de éxito:', error);
  }
};

/**
 * Reproduce un sonido de alerta/error
 */
const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Dos beeps rápidos para alerta
    for (let i = 0; i < 2; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 600; // Frecuencia más baja para alerta
      oscillator.type = 'square'; // Sonido más áspero
      gainNode.gain.value = 0.2;

      const startTime = audioContext.currentTime + (i * 0.15);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.1);
    }

    setTimeout(() => audioContext.close(), 500);
  } catch (error) {
    console.warn('[Notifications] No se pudo reproducir sonido de alerta:', error);
  }
};

/**
 * Reproduce el sonido apropiado según el tipo de notificación
 */
const playNotificationSound = (type?: string) => {
  if (!type) {
    playGenericBeep();
    return;
  }

  // Sonido de caja registradora SOLO para admins (nuevo pedido = dinero)
  if (type === 'admin.new_order') {
    playCashRegisterSound();
    return;
  }

  // Sonido de éxito suave para entregas (clientes)
  if (type === 'order.delivered') {
    playSuccessSound();
    return;
  }

  // Sonido de alerta para cancelaciones y problemas
  if (
    type === 'order.cancelled' ||
    type === 'admin.order_cancelled' ||
    type === 'driver.order_cancelled' ||
    type.startsWith('admin.order_unassigned') ||
    type.startsWith('admin.driver_inactive') ||
    type.startsWith('admin.low_stock')
  ) {
    playAlertSound();
    return;
  }

  // Beep genérico suave para clientes (order.created, order.preparing, etc.)
  // Menos intrusivo para no molestar
  playGenericBeep();
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
  const notificationType = payload.data?.type;

  // Reproducir sonido diferenciado según tipo
  playNotificationSound(notificationType);

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
