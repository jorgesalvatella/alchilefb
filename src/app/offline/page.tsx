'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-red-500/10 p-6 rounded-full">
            <WifiOff className="h-16 w-16 text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white">
          Sin Conexión
        </h1>

        {/* Description */}
        <p className="text-gray-400 text-lg">
          No se puede conectar a internet. Por favor verifica tu conexión y vuelve a intentarlo.
        </p>

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Reintentar
          </Button>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full"
          >
            Volver
          </Button>
        </div>

        {/* Tips */}
        <div className="pt-6 border-t border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Sugerencias:
          </h3>
          <ul className="text-sm text-gray-500 space-y-1 text-left">
            <li>• Verifica tu conexión WiFi o datos móviles</li>
            <li>• Activa el modo avión y vuelve a desactivarlo</li>
            <li>• Reinicia tu router si estás en WiFi</li>
            <li>• Intenta moverte a una zona con mejor señal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
