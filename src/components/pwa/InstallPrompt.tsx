'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

/**
 * Banner personalizado para instalar la PWA
 *
 * Android: Muestra botón que dispara el prompt nativo
 * iOS: Muestra instrucciones de cómo agregar a pantalla de inicio
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detectar si ya está instalado (modo standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Si NO está en standalone (navegador), limpiar flag de instalación
    // Esto permite que el banner se vuelva a mostrar si desinstalan la app
    if (!standalone) {
      localStorage.removeItem('pwa-installed');
    }

    // Verificar si el banner fue descartado recientemente (con expiración)
    const dismissedUntil = localStorage.getItem('pwa-install-dismissed');
    if (dismissedUntil) {
      // Manejar migración de versiones antiguas (dismissedUntil === 'true')
      if (dismissedUntil === 'true') {
        localStorage.removeItem('pwa-install-dismissed');
      } else {
        const dismissedDate = new Date(dismissedUntil);
        // Verificar que sea una fecha válida
        if (!isNaN(dismissedDate.getTime()) && dismissedDate > new Date()) {
          console.log('[InstallPrompt] Install prompt dismissed until', dismissedDate);
          return;
        } else {
          // Si ya expiró o es inválida, limpiar el flag
          localStorage.removeItem('pwa-install-dismissed');
        }
      }
    }

    const installed = localStorage.getItem('pwa-installed');

    if (installed || standalone) {
      return; // No mostrar si ya se instaló o está en standalone
    }

    // Android: Capturar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Mostrar el banner después de 3 segundos
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS: Mostrar después de 5 segundos si no está instalado
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostrar el prompt nativo de instalación
    deferredPrompt.prompt();

    // Esperar la elección del usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
      localStorage.setItem('pwa-installed', 'true');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // No molestar por 7 días si el usuario cierra el banner
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('pwa-install-dismissed', dismissUntil.toISOString());
    console.log('[InstallPrompt] Install prompt dismissed until', dismissUntil);
  };

  // No mostrar si ya está instalado o si no debe mostrarse
  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up">
      <div className="max-w-md mx-auto bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-2xl p-4 relative">
        {/* Botón cerrar */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icono de la app */}
          <div className="flex-shrink-0">
            <Image
              src="/icons/icon-96x96.png"
              alt="Al Chile"
              width={56}
              height={56}
              className="rounded-xl shadow-lg"
            />
          </div>

          {/* Contenido */}
          <div className="flex-1 pr-6">
            <h3 className="text-white font-bold text-lg mb-1">
              Instala Al Chile Delivery
            </h3>
            <p className="text-white/90 text-sm mb-3">
              Acceso rápido, notificaciones y funciona sin conexión
            </p>

            {/* Android: Botón de instalación */}
            {!isIOS && deferredPrompt && (
              <Button
                onClick={handleInstallClick}
                className="bg-white text-red-600 hover:bg-gray-100 font-semibold w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Instalar App
              </Button>
            )}

            {/* iOS: Instrucciones */}
            {isIOS && (
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-sm text-white">
                <p className="font-semibold mb-2 flex items-center">
                  <Share className="h-4 w-4 mr-2" />
                  Para instalar:
                </p>
                <ol className="space-y-1 text-xs text-white/90">
                  <li>1. Toca el botón <strong>Compartir</strong> ⬆️</li>
                  <li>2. Selecciona <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>3. Toca <strong>"Agregar"</strong></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
