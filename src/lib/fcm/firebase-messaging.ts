/**
 * Firebase Cloud Messaging - Cliente
 *
 * Este módulo inicializa Firebase Messaging en el cliente y proporciona
 * funciones para obtener tokens FCM y manejar permisos de notificaciones.
 */

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { FirebaseApp } from 'firebase/app';

// VAPID key desde variables de entorno
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

/**
 * Inicializa Firebase Messaging
 *
 * IMPORTANTE: Solo funciona en el cliente (useEffect, eventos, etc.)
 * NO llamar en Server Components
 */
export const initializeMessaging = (app: FirebaseApp): Messaging | null => {
  // Verificar que estamos en el navegador
  if (typeof window === 'undefined') {
    console.warn('[FCM] initializeMessaging llamado en servidor, saltando');
    return null;
  }

  // Verificar que el navegador soporta Service Workers
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service Workers no soportados en este navegador');
    return null;
  }

  // Verificar que el navegador soporta Notifications
  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications API no soportada en este navegador');
    return null;
  }

  try {
    const messaging = getMessaging(app);
    console.log('[FCM] Messaging inicializado correctamente');
    return messaging;
  } catch (error) {
    console.error('[FCM] Error al inicializar Messaging:', error);
    return null;
  }
};

/**
 * Verifica el estado actual de los permisos de notificaciones
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
};

/**
 * Solicita permisos de notificaciones al usuario
 *
 * @returns Promise con el estado del permiso: 'granted', 'denied', 'default'
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[FCM] Notification API no disponible');
    return 'default';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[FCM] Permiso de notificaciones:', permission);
    return permission;
  } catch (error) {
    console.error('[FCM] Error al solicitar permisos:', error);
    return 'default';
  }
};

/**
 * Registra el Service Worker de Firebase Messaging
 *
 * IMPORTANTE: Esto debe hacerse ANTES de obtener el token FCM
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[FCM] Service Workers no disponibles');
    return null;
  }

  try {
    // Registrar el Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
      updateViaCache: 'none' // Siempre buscar actualizaciones
    });

    console.log('[FCM] Service Worker registrado:', registration);

    // Esperar a que esté activo
    if (registration.active) {
      console.log('[FCM] Service Worker ya está activo');
      return registration;
    }

    // Esperar activación
    await new Promise<void>((resolve) => {
      const checkState = () => {
        if (registration.active) {
          resolve();
        } else {
          setTimeout(checkState, 100);
        }
      };
      checkState();
    });

    console.log('[FCM] Service Worker activado');
    return registration;
  } catch (error) {
    console.error('[FCM] Error al registrar Service Worker:', error);
    return null;
  }
};

/**
 * Obtiene el token FCM del dispositivo
 *
 * Requiere:
 * - Permisos de notificaciones otorgados
 * - Service Worker registrado
 * - VAPID key configurada
 *
 * @param messaging - Instancia de Firebase Messaging
 * @returns Token FCM o null si falla
 */
export const getFCMToken = async (messaging: Messaging): Promise<string | null> => {
  if (!VAPID_KEY) {
    console.error('[FCM] VAPID key no configurada en .env.local');
    return null;
  }

  try {
    // Verificar permisos
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[FCM] Permisos no otorgados, no se puede obtener token');
      return null;
    }

    // Verificar que el Service Worker esté registrado
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      console.warn('[FCM] Service Worker no registrado');
      return null;
    }

    // Obtener token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] Token FCM obtenido:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('[FCM] No se pudo obtener token FCM');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error al obtener token FCM:', error);
    return null;
  }
};

/**
 * Configura el listener para notificaciones en foreground
 *
 * Cuando la app está abierta y llega una notificación, este callback se ejecuta.
 *
 * @param messaging - Instancia de Firebase Messaging
 * @param callback - Función a ejecutar cuando llega una notificación
 * @returns Función para desuscribirse
 */
export const onForegroundMessage = (
  messaging: Messaging,
  callback: (payload: any) => void
): (() => void) => {
  console.log('[FCM] Configurando listener de mensajes en foreground');

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[FCM] Mensaje recibido en foreground:', payload);
    callback(payload);
  });

  return unsubscribe;
};

/**
 * Verifica si las notificaciones están soportadas y disponibles
 */
export const areNotificationsSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
};

/**
 * Verifica si el usuario ya ha interactuado con el prompt de permisos
 *
 * @returns true si ya pidió permisos antes (granted o denied)
 */
export const hasUserRespondedToPermission = (): boolean => {
  const permission = getNotificationPermission();
  return permission !== 'default';
};
