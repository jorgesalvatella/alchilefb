/**
 * Componente: FCMProvider
 *
 * Proveedor de Firebase Cloud Messaging que:
 * - Inicializa Firebase Messaging
 * - Configura listeners de notificaciones en foreground
 * - Configura listener de mensajes del Service Worker
 * - Gestiona el token FCM (vía useFCMToken hook)
 *
 * Debe montarse UNA VEZ en el layout principal
 */

'use client';

import { useEffect, useState } from 'react';
import { Messaging } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase/provider';
import { useFCMToken } from '@/hooks/use-fcm-token';
import { initializeMessaging } from '@/lib/fcm/firebase-messaging';
import {
  setupForegroundNotifications,
  setupServiceWorkerMessageListener
} from '@/lib/fcm/notification-handlers';

export const FCMProvider = () => {
  const firebaseApp = useFirebaseApp();
  const { permission } = useFCMToken(); // Esto maneja el registro del token

  const [messaging, setMessaging] = useState<Messaging | null>(null);

  /**
   * Inicializar Firebase Messaging
   */
  useEffect(() => {
    if (!firebaseApp) {
      return;
    }

    // Solo inicializar Messaging si tenemos permisos
    if (permission === 'granted') {
      console.log('[FCMProvider] Inicializando Messaging...');
      const messagingInstance = initializeMessaging(firebaseApp);
      setMessaging(messagingInstance);
    }
  }, [firebaseApp, permission]);

  /**
   * Configurar listener de notificaciones en foreground
   */
  useEffect(() => {
    if (!messaging) {
      return;
    }

    console.log('[FCMProvider] Configurando listeners de notificaciones');

    // Configurar listener de foreground
    const unsubscribeForeground = setupForegroundNotifications(messaging);

    // Configurar listener de mensajes del Service Worker
    setupServiceWorkerMessageListener();

    // Cleanup
    return () => {
      console.log('[FCMProvider] Limpiando listeners');
      unsubscribeForeground();
    };
  }, [messaging]);

  // Este componente no renderiza nada visible
  return null;
};
