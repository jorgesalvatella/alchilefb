/**
 * Componente: NotificationSettings
 *
 * Card de configuración de notificaciones para mostrar en /perfil o settings.
 *
 * Permite al usuario:
 * - Ver el estado actual de las notificaciones
 * - Activar notificaciones manualmente si las rechazó antes
 * - Ver instrucciones para habilitar notificaciones si están bloqueadas
 */

'use client';

import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFCMToken } from '@/hooks/use-fcm-token';
import { requestNotificationPermission } from '@/lib/fcm/firebase-messaging';
import { toast } from 'sonner';
import { useState } from 'react';

export const NotificationSettings = () => {
  const { permission, isSupported, token, registerToken } = useFCMToken();
  const [isActivating, setIsActivating] = useState(false);

  /**
   * Manejar activación manual de notificaciones
   */
  const handleActivate = async () => {
    setIsActivating(true);

    try {
      const result = await requestNotificationPermission();

      if (result === 'granted') {
        toast.success('¡Notificaciones activadas!');
        await registerToken();
      } else if (result === 'denied') {
        toast.error('Permisos denegados', {
          description: 'Revisa la configuración de tu navegador'
        });
      }
    } catch (error) {
      console.error('[NotificationSettings] Error:', error);
      toast.error('Error al activar notificaciones');
    } finally {
      setIsActivating(false);
    }
  };

  // No soportado
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificaciones no disponibles
          </CardTitle>
          <CardDescription>
            Tu navegador no soporta notificaciones push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Permisos otorgados
  if (permission === 'granted' && token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-green-500" />
            Notificaciones activadas
          </CardTitle>
          <CardDescription>
            Recibirás notificaciones de tus pedidos en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Token registrado: {token.substring(0, 20)}...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Permisos denegados
  if (permission === 'denied') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Notificaciones bloqueadas
          </CardTitle>
          <CardDescription>
            Has bloqueado las notificaciones para este sitio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Para activarlas, sigue estos pasos:
          </p>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Haz click en el icono de candado en la barra de direcciones</li>
            <li>Busca la opción "Notificaciones"</li>
            <li>Cambia a "Permitir"</li>
            <li>Recarga esta página</li>
          </ol>
        </CardContent>
      </Card>
    );
  }

  // Permisos pendientes (default)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificaciones push
        </CardTitle>
        <CardDescription>
          Recibe actualizaciones de tus pedidos en tiempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Te notificaremos cuando:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Tu pedido sea confirmado</li>
            <li>Esté en preparación</li>
            <li>Un repartidor sea asignado</li>
            <li>Esté en camino</li>
            <li>Sea entregado</li>
          </ul>
        </div>

        <Button
          onClick={handleActivate}
          disabled={isActivating}
          className="w-full"
        >
          {isActivating ? 'Activando...' : 'Activar notificaciones'}
        </Button>
      </CardContent>
    </Card>
  );
};
