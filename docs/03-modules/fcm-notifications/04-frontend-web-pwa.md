# 🌐 FASE 4: Frontend Web (PWA) - Notificaciones Push

**Fecha de implementación**: 2025-11-01
**Agente responsable**: Aether (UI/UX)
**Estado**: ✅ IMPLEMENTADO

---

## 📋 Resumen

Se implementó la infraestructura completa de notificaciones push para el frontend web, incluyendo:

- Service Worker para notificaciones en background
- Hooks para gestión de tokens FCM
- Componentes UI para solicitar permisos
- Manejadores de notificaciones en foreground
- Integración completa en el layout principal

---

## ✅ Archivos Creados

### 1. Service Worker
```
public/firebase-messaging-sw.js
```
- Maneja notificaciones en background (pestaña no visible/cerrada)
- Implementa estrategia "Focus pestaña existente + navegar"
- Gestiona clicks en notificaciones

### 2. Librerías FCM

```
src/lib/fcm/
├── firebase-messaging.ts       # Inicialización y funciones core
└── notification-handlers.ts    # Manejadores de notificaciones foreground
```

**firebase-messaging.ts** exporta:
- `initializeMessaging()` - Inicializa Firebase Messaging
- `requestNotificationPermission()` - Solicita permisos
- `registerServiceWorker()` - Registra el SW
- `getFCMToken()` - Obtiene el token FCM
- `areNotificationsSupported()` - Verifica soporte
- `getNotificationPermission()` - Estado de permisos

**notification-handlers.ts** exporta:
- `setupForegroundNotifications()` - Configura listener foreground
- `setupServiceWorkerMessageListener()` - Listener de mensajes SW
- Funciones helper para mostrar toasts

### 3. Hooks

```
src/hooks/use-fcm-token.ts
```

Hook `useFCMToken()` que retorna:
```typescript
{
  token: string | null;           // Token FCM
  isLoading: boolean;             // Estado de carga
  error: string | null;           // Errores
  permission: NotificationPermission; // 'granted' | 'denied' | 'default'
  isSupported: boolean;           // Si el navegador soporta
  registerToken: () => Promise<void>; // Función manual
}
```

**Comportamiento:**
- Auto-registra token si el usuario ya tiene permisos otorgados
- Registra token en el backend automáticamente
- Limpia token al cerrar sesión

### 4. Componentes UI

```
src/components/notifications/
├── FCMProvider.tsx                     # Proveedor (se monta en layout)
├── NotificationPermissionBanner.tsx    # Banner superior (primera vez)
└── NotificationSettings.tsx            # Card para /perfil (manual)
```

**NotificationPermissionBanner:**
- Banner superior que solicita permisos
- Se muestra SOLO la primera vez al hacer login
- Guarda en localStorage que ya se mostró
- No vuelve a aparecer si el usuario ya respondió
- Se puede cerrar sin activar

**NotificationSettings:**
- Card para mostrar en `/perfil` o configuración
- Permite activar manualmente si el usuario rechazó
- Muestra estado actual (activadas/bloqueadas/pendientes)
- Instrucciones para desbloquear si están denegadas

**FCMProvider:**
- Se monta una vez en el layout
- Inicializa Messaging cuando hay permisos
- Configura listeners de foreground y SW

### 5. Integración en Layout

```
src/app/layout.tsx
```

Se agregaron:
```tsx
<FCMProvider />
<NotificationPermissionBanner />
```

### 6. Integración en Perfil

```
src/app/perfil/page.tsx
```

Se agregó el componente `NotificationSettings`:
```tsx
<NotificationSettings />
```

- Ubicado entre el formulario de edición de perfil y el botón de cerrar sesión
- Permite a los usuarios gestionar manualmente sus notificaciones
- Muestra el estado actual (activadas/bloqueadas/pendientes)
- Proporciona instrucciones para desbloquear si fueron denegadas

---

## 🎯 Decisiones de Diseño

### 1. **Timing: Primera vez al login**
- Banner se muestra solo la primera vez que el usuario hace login
- Se guarda en `localStorage` con key `fcm-permission-prompt-shown`
- Si el usuario ya respondió (granted/denied), no se vuelve a mostrar

### 2. **Ubicación: Banner Inferior**
- Banner fijo en la parte inferior de la pantalla
- Gradiente azul-púrpura para llamar la atención
- Se puede cerrar con botón X
- No interfiere con la navegación del header

### 3. **Foreground: Toast (Sonner) + Sonidos Diferenciados**
- Notificaciones en foreground se muestran como toast
- Usa Sonner (ya configurado en el proyecto)
- **Sonidos diferenciados según tipo de evento:**
  - 🔔 **Caja registradora**: SOLO para admins (`admin.new_order`) - indica dinero/ingresos
  - ✅ **Campana de éxito**: Pedido entregado (`order.delivered`) - suave y celebratorio
  - ⚠️ **Alerta (2 beeps)**: Cancelaciones y problemas (`order.cancelled`, `admin.order_cancelled`, etc.)
  - 🔊 **Beep genérico suave**: Para clientes (order.created, order.preparing, etc.) - menos intrusivo
- Botón "Ver" para navegar a la URL

### 4. **Navegación: Focus pestaña existente**
- Si la app ya está abierta → hace focus y navega
- Si no está abierta → abre nueva pestaña
- Implementado en el Service Worker

---

## 🔧 Flujo de Trabajo

### Escenario 1: Usuario nuevo (primera vez)

1. Usuario hace login
2. Banner superior aparece automáticamente
3. Usuario hace click en "Activar"
4. Navegador solicita permisos (popup nativo)
5. Si acepta:
   - Hook `useFCMToken` obtiene el token FCM
   - Token se registra en backend (`POST /api/fcm/register-token`)
   - Toast de éxito
   - Banner se oculta
6. Si rechaza:
   - Toast informativo
   - Banner se oculta
   - Se guarda en localStorage para no volver a mostrar

### Escenario 2: Usuario que rechazó (activación manual)

1. Usuario va a `/perfil`
2. Ve el componente `NotificationSettings`
3. Estado muestra "Permisos denegados" con instrucciones
4. Usuario sigue instrucciones en el navegador
5. Recarga la página
6. Ahora puede hacer click en "Activar notificaciones"

### Escenario 3: Usuario con permisos otorgados (regreso)

1. Usuario hace login
2. Hook `useFCMToken` detecta `permission === 'granted'`
3. Auto-registra el token en backend
4. Banner NO aparece (ya respondió antes)
5. Listo para recibir notificaciones

### Escenario 4: Notificación llega (foreground)

1. Usuario está usando la app (pestaña visible)
2. Backend envía notificación push
3. `FCMProvider` recibe el mensaje
4. `notification-handlers.ts` muestra toast con Sonner
5. Reproduce sonido diferenciado según tipo:
   - **Admin recibe nuevo pedido** → 🔔 Caja registradora (cha-ching) - indica dinero
   - **Cliente recibe confirmación de pedido** → 🔊 Beep genérico suave - menos intrusivo
   - **Cliente recibe notificación de entrega** → ✅ Campana de éxito suave
   - **Cancelación de pedido** → ⚠️ Alerta (2 beeps)
   - **Otros eventos de cliente** → 🔊 Beep genérico suave
6. Usuario puede hacer click en "Ver" para navegar

### Escenario 5: Notificación llega (background)

1. Usuario NO está viendo la app (pestaña oculta/cerrada)
2. Backend envía notificación push
3. Service Worker recibe el mensaje
4. Muestra notificación nativa del navegador
5. Usuario hace click en la notificación
6. SW busca pestaña existente de la app:
   - Si existe → hace focus y navega
   - Si no existe → abre nueva pestaña

---

## 📡 Integración con Backend

### Endpoint: `POST /api/fcm/register-token`

**Request:**
```json
{
  "token": "fcm-token-aqui...",
  "platform": "web",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "appVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token registrado exitosamente",
  "tokenId": "abc123"
}
```

**Headers:**
- `Authorization: Bearer <idToken>` - Token de Firebase Auth

**Comportamiento:**
- Si el token ya existe → actualiza `lastUsed`
- Si es nuevo → crea documento en `deviceTokens`
- Valida que el token pertenece al usuario autenticado
- Limita a 10 tokens por usuario

### Endpoint: `DELETE /api/fcm/unregister-token`

**Request:**
```json
{
  "token": "fcm-token-aqui..."
}
```

Se llama automáticamente cuando el usuario cierra sesión.

---

## 🧪 Testing

### Tests Manuales Realizados

✅ **Build pasa sin errores** (`npm run build`)
✅ **TypeScript compila correctamente**
✅ **Service Worker se registra** (verificar en DevTools → Application → Service Workers)
✅ **Permisos se solicitan correctamente**
✅ **Token se registra en backend**

### Tests Pendientes (FASE 4B)

- [ ] Test unitario: `useFCMToken` hook
- [ ] Test unitario: `NotificationPermissionBanner` component
- [ ] Test unitario: `NotificationSettings` component
- [ ] Test E2E: Flujo completo de activación
- [ ] Test E2E: Recibir notificación en foreground
- [ ] Test E2E: Click en notificación background

---

## 🔐 Seguridad

### Validaciones Implementadas

1. **Solo usuarios autenticados** pueden registrar tokens
   - Hook verifica `user` antes de registrar
   - Backend valida `authMiddleware`

2. **VAPID key en variables de entorno**
   - `NEXT_PUBLIC_FCM_VAPID_KEY` en `.env.local`
   - No hardcodeada en el código

3. **Service Worker scope limitado**
   - Scope: `/` (solo la app)
   - No accede a otros dominios

4. **Validación de origen**
   - Service Worker solo responde a mensajes de Firebase

---

## 📝 Variables de Entorno Requeridas

```bash
# .env.local

# VAPID Key (obtener de Firebase Console)
NEXT_PUBLIC_FCM_VAPID_KEY=BOkLhC5_gz17o2Dak1177EN3ragHqE94sD7YbLomBJVLh_K94ue2E5MFGlPSiW7fVG0dElO-OMxArohHksqY8XM

# Firebase Config (ya existe)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-9824031244-700aa
```

**Cómo obtener VAPID key:**
1. Firebase Console → Project Settings
2. Cloud Messaging tab
3. Web Push certificates → Generate key pair
4. Copiar la clave generada

---

## 🚀 Deployment

### Producción

```bash
# Build
npm run build

# Verificar Service Worker
# Abrir: https://tu-dominio.com
# DevTools → Application → Service Workers
# Debe aparecer: firebase-messaging-sw.js (activated)

# Verificar permisos
# DevTools → Console
# Ejecutar: Notification.permission
# Debe ser: "granted" (si activó), "denied" (si rechazó), "default" (pendiente)
```

### Troubleshooting

**Problema:** Service Worker no se registra

**Solución:**
- Verificar que `/firebase-messaging-sw.js` esté en `/public/`
- Abrir DevTools → Console → buscar errores
- Verificar HTTPS (Service Workers requieren HTTPS en producción)

**Problema:** Token no se obtiene

**Solución:**
- Verificar `NEXT_PUBLIC_FCM_VAPID_KEY` en `.env.local`
- Verificar permisos: `Notification.permission` debe ser `"granted"`
- Verificar que el Service Worker esté activo

**Problema:** Notificaciones no llegan

**Solución:**
- Verificar que el token esté registrado en backend (check Firestore)
- Verificar que el backend esté enviando notificaciones
- Verificar logs del backend para errores de FCM

---

## 📚 Próximos Pasos (FASE 4B - Opcional)

### Mejoras Futuras

1. **Badge/Contador en Header**
   - Componente `NotificationBadge` en header
   - Contador de notificaciones no leídas
   - Estado global con Zustand o Context

2. **Centro de Notificaciones**
   - Página `/notificaciones`
   - Historial de notificaciones
   - Marcar como leídas
   - Filtros por tipo

3. **Preferencias de Notificaciones**
   - Checkbox por tipo de evento
   - "Solo pedidos importantes"
   - "No molestar" durante horarios

4. **Estadísticas**
   - Dashboard para admins
   - Tasa de apertura de notificaciones
   - Dispositivos activos

---

---

## 🔊 Sonidos Diferenciados (Mejora Post-FASE 4)

**Fecha de implementación**: 2025-11-02
**Mejora por**: Aether + Sentinel

Se implementaron sonidos diferenciados para mejorar la experiencia del usuario:

### Tipos de Sonidos

| Tipo de Evento | Sonido | Descripción |
|----------------|--------|-------------|
| **Pedido nuevo ADMIN** (`admin.new_order`) | 🔔 Caja registradora | Sonido "cha-ching" con 3 osciladores (1200Hz, 2000Hz, 3000Hz) ~500ms |
| **Pedido entregado** (`order.delivered`) | ✅ Campana de éxito | Tono agudo (1200Hz) con decay suave ~400ms |
| **Cancelación** (`order.cancelled`, `admin.order_cancelled`, `driver.order_cancelled`) | ⚠️ Alerta | 2 beeps cortos (600Hz, square wave) ~300ms |
| **Problemas admin** (`admin.order_unassigned`, `admin.driver_inactive`, `admin.low_stock`) | ⚠️ Alerta | 2 beeps cortos (600Hz) |
| **Eventos cliente** (`order.created`, `order.preparing`, etc.) | 🔊 Beep genérico suave | Beep simple (800Hz) ~200ms - menos intrusivo |

### Implementación

**Archivo**: `src/lib/fcm/notification-handlers.ts`

```typescript
const playNotificationSound = (type?: string) => {
  // Caja registradora SOLO para admins (nuevo pedido = dinero)
  if (type === 'admin.new_order') {
    playCashRegisterSound(); // Reutiliza utilidad del dashboard de repartidor
  }
  // Campana de éxito para entregas (clientes)
  else if (type === 'order.delivered') {
    playSuccessSound();
  }
  // Alerta para cancelaciones y problemas
  else if (/* cancelaciones y problemas */) {
    playAlertSound();
  }
  // Beep genérico suave para clientes (menos intrusivo)
  else {
    playGenericBeep(); // order.created, order.preparing, etc.
  }
};
```

### Beneficios

- ✅ **Admins saben inmediatamente** cuando hay un pedido nuevo ($$$ feeling con caja registradora)
- ✅ **Clientes: experiencia menos intrusiva** - beeps suaves para eventos normales
- ✅ **Clientes celebran suavemente** cuando su pedido llega (campana de éxito)
- ✅ **Alertas claras** para cancelaciones y problemas (todos los roles)
- ✅ **Diferenciación auditiva** sin necesidad de mirar la pantalla
- ✅ **Reutilización** del sonido de caja registradora del dashboard de repartidor

---

## 📊 Métricas de Éxito

### Criterios de Aceptación (FASE 4)

- [x] Usuario puede otorgar permisos de notificaciones
- [x] Token FCM se registra en Firestore
- [x] Notificaciones se reciben en foreground (toast)
- [x] Notificaciones se reciben en background (SW)
- [x] Click en notificación navega a página correcta
- [x] Banner solo aparece primera vez
- [x] Opción manual en settings
- [x] Build pasa sin errores
- [x] **Sonidos diferenciados por tipo de evento** ✅ NUEVO
- [ ] Tests frontend: 100% pasando (PENDIENTE)

---

**Mantenido por**: Equipo de Desarrollo Al Chile FB
**Última actualización**: 2025-11-02
**Versión**: 1.1 (agregados sonidos diferenciados)
