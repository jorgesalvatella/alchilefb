'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa/register-sw';

/**
 * Componente que registra el Service Worker automáticamente
 * Se monta una vez en el layout principal
 */
export function PWAInstaller() {
  useEffect(() => {
    // Registrar SW cuando el componente se monte
    registerServiceWorker();
  }, []);

  // Este componente no renderiza nada
  return null;
}
