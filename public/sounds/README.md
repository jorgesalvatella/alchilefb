# Sonidos de Notificaciones

Esta carpeta contiene los archivos de audio para notificaciones FCM.

## Archivos

- `cash-register.mp3` - Sonido de caja registradora para admins (nuevos pedidos)
- `gentle-notification.mp3` - Sonido suave para clientes
- `alert.mp3` - Sonido de alerta para problemas/cancelaciones

## Generación

Los archivos de audio se pueden generar:
1. Manualmente con herramientas de edición de audio
2. Usando servicios web como freesound.org
3. Usando AI audio generators

## Formato Recomendado

- **Formato**: MP3 (mejor compatibilidad cross-browser)
- **Duración**: 0.5-2 segundos
- **Tamaño**: < 50KB cada uno
- **Sample Rate**: 44.1kHz
- **Bitrate**: 128kbps

## Implementación

El Service Worker (`firebase-messaging-sw.js`) selecciona el sonido según el tipo de notificación:
- `admin.new_order` → cash-register.mp3
- `order.created`, `order.preparing` → gentle-notification.mp3
- `order.cancelled`, alertas → alert.mp3
