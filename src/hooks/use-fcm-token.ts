/**
 * Hook: useFCMToken
 *
 * Gestiona el ciclo de vida completo del token FCM:
 * - Registra el Service Worker
 * - Obtiene el token FCM
 * - Lo registra en el backend
 * - Maneja renovación del token
 * - Limpia el token al cerrar sesión
 */

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/provider';
import { useFirebaseApp } from '@/firebase/provider';
import {
  initializeMessaging,
  registerServiceWorker,
  getFCMToken,
  getNotificationPermission,
  areNotificationsSupported
} from '@/lib/fcm/firebase-messaging';

interface UseFCMTokenResult {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  registerToken: () => Promise<void>;
}

/**
 * Hook para obtener y gestionar el token FCM
 *
 * IMPORTANTE: Solo se ejecuta si:
 * - El usuario está autenticado
 * - El navegador soporta notificaciones
 * - El usuario otorgó permisos
 *
 * @returns Estado del token FCM
 */
export const useFCMToken = (): UseFCMTokenResult => {
  const { user, isUserLoading } = useUser();
  const firebaseApp = useFirebaseApp();

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported] = useState(() => areNotificationsSupported());

  /**
   * Registra el token FCM en el backend
   */
  const registerTokenInBackend = async (fcmToken: string) => {
    if (!user) {
      console.warn('[useFCMToken] No hay usuario autenticado');
      return;
    }

    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/fcm/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          token: fcmToken,
          platform: 'web',
          deviceInfo: {
            userAgent: navigator.userAgent,
            appVersion: '1.0.0' // TODO: obtener de package.json
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar token');
      }

      const data = await response.json();
      console.log('[useFCMToken] Token registrado en backend:', data);
    } catch (err) {
      console.error('[useFCMToken] Error al registrar token en backend:', err);
      throw err;
    }
  };

  /**
   * Obtiene el token FCM y lo registra en el backend
   */
  const registerToken = async () => {
    if (!isSupported) {
      setError('Notificaciones no soportadas en este navegador');
      setIsLoading(false);
      return;
    }

    if (!firebaseApp) {
      setError('Firebase no inicializado');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Registrar Service Worker
      console.log('[useFCMToken] Registrando Service Worker...');
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('No se pudo registrar el Service Worker');
      }

      // 2. Verificar permisos
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      if (currentPermission !== 'granted') {
        console.log('[useFCMToken] Permisos no otorgados, esperando acción del usuario');
        setIsLoading(false);
        return;
      }

      // 3. Inicializar Messaging
      console.log('[useFCMToken] Inicializando Firebase Messaging...');
      const messaging = initializeMessaging(firebaseApp);
      if (!messaging) {
        throw new Error('No se pudo inicializar Firebase Messaging');
      }

      // 4. Obtener token FCM
      console.log('[useFCMToken] Obteniendo token FCM...');
      const fcmToken = await getFCMToken(messaging);
      if (!fcmToken) {
        throw new Error('No se pudo obtener el token FCM');
      }

      setToken(fcmToken);

      // 5. Registrar en backend
      console.log('[useFCMToken] Registrando token en backend...');
      await registerTokenInBackend(fcmToken);

      console.log('[useFCMToken] ✅ Token FCM registrado exitosamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('[useFCMToken] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Efecto principal: Registrar token cuando el usuario está autenticado
   * y tiene permisos otorgados
   */
  useEffect(() => {
    // Esperar a que termine de cargar el usuario
    if (isUserLoading) {
      return;
    }

    // Si no hay usuario, resetear estado
    if (!user) {
      setToken(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Verificar si el navegador soporta notificaciones
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    // Verificar permisos actuales
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    // Solo auto-registrar si ya tiene permisos otorgados
    // (el usuario ya aceptó en una sesión anterior)
    if (currentPermission === 'granted') {
      registerToken();
    } else {
      setIsLoading(false);
    }
  }, [user, isUserLoading, firebaseApp, isSupported]);

  /**
   * Efecto: Limpiar token del backend al cerrar sesión
   */
  useEffect(() => {
    // Si había un token y ahora no hay usuario (logout), limpiar
    if (!user && token) {
      console.log('[useFCMToken] Usuario cerró sesión, limpiando token');

      // Llamar al endpoint de eliminación (fire-and-forget)
      fetch('/api/fcm/unregister-token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      }).catch((err) => {
        console.error('[useFCMToken] Error al eliminar token:', err);
      });

      setToken(null);
    }
  }, [user, token]);

  return {
    token,
    isLoading,
    error,
    permission,
    isSupported,
    registerToken
  };
};
