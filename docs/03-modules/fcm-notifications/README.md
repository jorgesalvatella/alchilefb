# 📱 Módulo FCM Push Notifications - Al Chile FB

## 📋 Información del Módulo

**Agente responsable**: Sentinel (Coordinador) + Pyra (Firebase) + Nexus (Backend) + Aether (Frontend)
**Fecha de creación**: 2025-10-26
**Versión**: 1.0
**Estado**: 📝 En Planificación

---

## 🎯 Objetivo

Implementar un sistema completo de **Push Notifications** usando Firebase Cloud Messaging (FCM) para notificar en tiempo real a usuarios, repartidores y administradores sobre eventos importantes de la plataforma **Al Chile FB**.

### Alcance

- ✅ **Multi-rol**: Notificaciones personalizadas para usuarios, repartidores y admins
- ✅ **Multi-plataforma**: Web (PWA), Android e iOS
- ✅ **Tiempo real**: Eventos instantáneos vía FCM
- ✅ **Estadísticas**: Métricas de envío, entrega y clics

---

## 🔍 Decisiones Tomadas

Basado en el análisis del proyecto y las necesidades del negocio:

| # | Aspecto | Decisión | Razón |
|---|---------|----------|-------|
| 1 | **Eventos para Clientes** | Notificaciones completas | Estado de pedidos + asignación repartidor + ofertas + recordatorios |
| 2 | **Eventos para Repartidores** | Sistema completo | Asignación + cancelaciones + recordatorios + cambios de estado |
| 3 | **Eventos para Admins** | Dashboard completo | Nuevos pedidos + alertas + métricas + problemas |
| 4 | **Plataformas** | Web + Android + iOS | Desde el inicio, infraestructura completa |
| 5 | **Configuración de usuario** | Sin preferencias | Simplicidad: todos reciben todas las notificaciones |
| 6 | **Almacenamiento de tokens** | Colección `deviceTokens` | Escalable, múltiples dispositivos por usuario |
| 7 | **Historial** | Solo estadísticas | Contadores de enviadas/leídas/clicadas |

---

## 🏗️ Arquitectura General

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE NOTIFICACIONES FCM                       │
└──────────────────────────────────────────────────────────────────────┘

1. EVENTO TRIGGER (Nuevo pedido, cambio de estado, etc.)
   │
   ├─▶ Backend detecta evento (Firestore Trigger / API endpoint)
   │
   ├─▶ Determina destinatarios según rol y evento
   │
   ├─▶ Consulta tokens FCM de dispositivos activos
   │
   ├─▶ Firebase Admin SDK envía notificación multicast
   │
   ├─▶ FCM distribuye a dispositivos
   │       │
   │       ├─▶ Web (Service Worker)
   │       ├─▶ Android (FCM SDK)
   │       └─▶ iOS (APNs via FCM)
   │
   └─▶ Actualiza estadísticas (enviadas, entregadas, clicadas)


2. REGISTRO DE DISPOSITIVO
   │
   ├─▶ Usuario abre app/web
   │
   ├─▶ Frontend solicita permiso de notificaciones
   │
   ├─▶ Genera token FCM del dispositivo
   │
   ├─▶ POST /api/fcm/register-token
   │
   ├─▶ Backend guarda en deviceTokens (Firestore)
   │
   └─▶ Token listo para recibir notificaciones


3. NOTIFICACIONES POR ROL

   CLIENTE (usuario normal):
   - Pedido confirmado: "¡Tu pedido #123 ha sido recibido!"
   - En preparación: "Tu pedido está siendo preparado"
   - Repartidor asignado: "Juan está en camino con tu pedido"
   - En camino: "Tu pedido está a 5 minutos"
   - Entregado: "¡Disfruta tu comida! Califica tu experiencia"
   - Cancelado: "Tu pedido ha sido cancelado"
   - Promoción: "🔥 20% de descuento en tacos hoy"

   REPARTIDOR:
   - Nuevo pedido: "Tienes un nuevo pedido asignado #123"
   - Pedido listo: "Pedido #123 listo para recoger"
   - Cancelación: "El pedido #123 ha sido cancelado"
   - Recordatorio: "Tienes 2 pedidos pendientes de entregar"
   - Actualización: "El admin cambió la dirección del pedido #123"

   ADMIN (super_admin, admin):
   - Nuevo pedido: "Nuevo pedido #123 - $350 MXN"
   - Pedido sin asignar: "⚠️ Pedido #123 lleva 10 min sin repartidor"
   - Repartidor inactivo: "Juan lleva 30 min sin actualizar ubicación"
   - Alerta inventario: "⚠️ Stock bajo: Tortillas (5 unidades)"
   - Métrica importante: "📊 15 pedidos en la última hora"
```

---

## 📊 Modelo de Datos (Firestore)

### Colección: `deviceTokens` (NUEVA)

Almacena los tokens FCM de cada dispositivo registrado.

```typescript
interface DeviceToken {
  id: string;                          // Auto-generado por Firestore
  userId: string;                      // UID del usuario
  token: string;                       // Token FCM del dispositivo
  platform: 'web' | 'android' | 'ios'; // Plataforma

  // Metadata del dispositivo
  deviceInfo: {
    userAgent?: string;                // Web: navigator.userAgent
    deviceModel?: string;              // Móvil: modelo del dispositivo
    osVersion?: string;                // Versión del SO
    appVersion?: string;               // Versión de la app
  };

  // Estado
  isActive: boolean;                   // true si el token es válido

  // Timestamps
  createdAt: Timestamp;                // Fecha de registro
  lastUsed: Timestamp;                 // Última vez que se usó
  expiresAt?: Timestamp;               // Opcional: para invalidar tokens
}
```

**Índices necesarios:**
- `userId` + `platform` + `isActive`
- `token` (único)
- `lastUsed` (para limpiar tokens antiguos)

---

### Colección: `notificationStats` (NUEVA)

Estadísticas agregadas de notificaciones.

```typescript
interface NotificationStats {
  id: string;                          // userId o 'global'

  // Contadores generales
  totalSent: number;                   // Total enviadas
  totalDelivered: number;              // Total entregadas
  totalClicked: number;                // Total clicadas
  totalFailed: number;                 // Total fallidas

  // Por tipo de notificación
  byType: {
    [key: string]: {                   // 'order_status', 'driver_assigned', etc.
      sent: number;
      delivered: number;
      clicked: number;
    };
  };

  // Por plataforma
  byPlatform: {
    web: { sent: number; delivered: number; clicked: number };
    android: { sent: number; delivered: number; clicked: number };
    ios: { sent: number; delivered: number; clicked: number };
  };

  // Timestamps
  lastUpdated: Timestamp;
  period?: string;                     // 'daily', 'weekly', 'monthly'
}
```

---

### Modificación: Colección `pedidos`

Se agregará tracking de notificaciones enviadas (opcional):

```typescript
interface Order {
  // ... campos existentes ...

  // NUEVO: Tracking de notificaciones (opcional)
  notificationsSent?: {
    orderCreated?: Timestamp;          // Cuándo se notificó creación
    preparing?: Timestamp;             // Cuándo se notificó preparación
    inDelivery?: Timestamp;            // Cuándo se notificó en reparto
    delivered?: Timestamp;             // Cuándo se notificó entrega
  };
}
```

---

## 🔐 Variables de Entorno Requeridas

### Backend (.env)

```bash
# FIREBASE ADMIN SDK (ya existe)
FIREBASE_PROJECT_ID=studio-9824031244-700aa
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# FCM (Cloud Messaging) - NO requiere variables adicionales
# El Admin SDK usa las credenciales existentes

# CONFIGURACIÓN DE NOTIFICACIONES
FCM_MAX_TOKENS_PER_USER=10           # Máximo de dispositivos por usuario
FCM_TOKEN_CLEANUP_DAYS=90            # Limpiar tokens no usados en 90 días
FCM_BATCH_SIZE=500                   # Enviar notificaciones en lotes de 500
```

### Frontend (.env.local)

```bash
# FIREBASE CONFIG (ya existe)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# FCM - VAPID KEY (para Web Push)
NEXT_PUBLIC_FCM_VAPID_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx  # Se obtiene de Firebase Console
```

---

## 🗂️ Estructura de Archivos del Módulo

```
alchilefb/
│
├── docs/
│   └── 03-modules/
│       └── fcm-notifications/
│           ├── README.md                        (este archivo)
│           ├── 01-firebase-console-setup.md     (configuración Firebase)
│           ├── 02-backend-implementation.md     (implementación backend)
│           ├── 03-frontend-web-pwa.md           (implementación Web PWA)
│           ├── 04-android-ios-setup.md          (setup Android/iOS)
│           ├── 05-notification-events.md        (catálogo de eventos)
│           └── 06-testing-guide.md              (guía de testing)
│
├── backend/
│   ├── fcm/
│   │   ├── fcm-service.js                       (servicio principal FCM)
│   │   ├── notification-builder.js              (constructor de notificaciones)
│   │   ├── token-manager.js                     (gestión de tokens)
│   │   └── stats-tracker.js                     (tracking de estadísticas)
│   ├── routes/
│   │   └── fcm.js                               (endpoints API)
│   ├── triggers/
│   │   ├── order-notifications.js               (triggers de pedidos)
│   │   ├── driver-notifications.js              (triggers de repartidores)
│   │   └── admin-notifications.js               (triggers de admins)
│   └── app.js                                   (registro de rutas)
│
├── src/
│   ├── app/
│   │   └── (service workers registrados aquí)
│   ├── components/
│   │   └── notifications/
│   │       ├── NotificationPermissionPrompt.tsx (UI permisos)
│   │       ├── NotificationBadge.tsx            (badge contador)
│   │       └── NotificationList.tsx             (lista de notificaciones)
│   ├── hooks/
│   │   ├── use-fcm-token.ts                     (hook registrar token)
│   │   └── use-notifications.ts                 (hook recibir notificaciones)
│   ├── lib/
│   │   └── fcm/
│   │       ├── firebase-messaging.ts            (inicialización FCM)
│   │       └── notification-handlers.ts         (manejadores)
│   └── public/
│       └── firebase-messaging-sw.js             (Service Worker)
│
├── backend/__tests__/
│   └── fcm/
│       ├── fcm-service.test.js
│       ├── notification-builder.test.js
│       ├── token-manager.test.js
│       └── fcm-routes.test.js
│
└── src/__tests__/
    └── fcm/
        ├── use-fcm-token.test.ts
        └── notification-handlers.test.ts
```

---

## 🚀 Plan de Implementación (6 Fases)

### **FASE 1: Arquitectura y Configuración Base** ⚙️

**Tiempo estimado:** 2-3 horas
**Agente responsable:** Aire (DevOps) + Pyra (Firebase)

**Tareas:**
1. Configurar Firebase Cloud Messaging en Firebase Console
   - Habilitar Cloud Messaging API
   - Generar VAPID key para Web Push
   - Configurar certificados APNs (iOS)
2. Crear colección `deviceTokens` en Firestore
3. Crear colección `notificationStats` en Firestore
4. Configurar Security Rules para nuevas colecciones
5. Configurar variables de entorno
6. Actualizar documentación

**Entregables:**
- ✅ FCM habilitado en Firebase Console
- ✅ VAPID key generada
- ✅ Colecciones creadas en Firestore
- ✅ Security Rules configuradas
- ✅ Documento `01-firebase-console-setup.md`

**Criterios de aceptación:**
- [ ] FCM habilitado en proyecto Firebase
- [ ] VAPID key generada y guardada en `.env.local`
- [ ] Colecciones `deviceTokens` y `notificationStats` existen
- [ ] Security Rules protegen las colecciones correctamente

---

### **FASE 2: Backend - Infraestructura Core** 🔧

**Tiempo estimado:** 4-5 horas
**Agente responsable:** Nexus (Backend)

**Tareas:**
1. Implementar `backend/fcm/fcm-service.js`
   - Métodos: `sendToDevice()`, `sendMulticast()`, `sendToTopic()`
   - Manejo de errores y tokens inválidos
2. Implementar `backend/fcm/token-manager.js`
   - Registrar/eliminar tokens
   - Validar tokens duplicados
   - Limpiar tokens expirados
3. Implementar `backend/fcm/notification-builder.js`
   - Constructor de payloads FCM
   - Templates de notificaciones
4. Implementar `backend/fcm/stats-tracker.js`
   - Incrementar contadores
   - Actualizar estadísticas
5. Crear endpoints API en `backend/routes/fcm.js`
   - `POST /api/fcm/register-token`
   - `DELETE /api/fcm/unregister-token`
   - `GET /api/fcm/stats` (solo admins)
6. Escribir tests unitarios (Jest)

**Entregables:**
- ✅ Servicios FCM funcionales
- ✅ Endpoints API documentados
- ✅ Tests unitarios pasando (>90% cobertura)
- ✅ Documento `02-backend-implementation.md`

**Criterios de aceptación:**
- [ ] `fcm-service.js` puede enviar notificaciones a dispositivos
- [ ] `token-manager.js` registra y elimina tokens correctamente
- [ ] Endpoints API funcionan con autenticación
- [ ] Tests backend: 100% pasando

---

### **FASE 3: Backend - Triggers de Notificaciones** 🔔

**Tiempo estimado:** 5-6 horas
**Agente responsable:** Nexus (Backend) + Sentinel (Coordinación)

**Tareas:**
1. Implementar `backend/triggers/order-notifications.js`
   - Trigger: Nuevo pedido → Notificar cliente + admins
   - Trigger: Cambio de estado → Notificar cliente
   - Trigger: Pedido cancelado → Notificar cliente + repartidor
2. Implementar `backend/triggers/driver-notifications.js`
   - Trigger: Repartidor asignado → Notificar repartidor
   - Trigger: Pedido listo → Notificar repartidor
   - Trigger: Pedido actualizado → Notificar repartidor
3. Implementar `backend/triggers/admin-notifications.js`
   - Trigger: Nuevo pedido → Notificar admins
   - Trigger: Pedido sin asignar (>10 min) → Notificar admins
   - Trigger: Alerta de inventario → Notificar admins
4. Integrar triggers con endpoints existentes
   - Modificar `backend/pedidos.js` para llamar triggers
   - Modificar `backend/repartidores.js` para notificaciones
5. Escribir tests de integración

**Entregables:**
- ✅ Triggers implementados y funcionando
- ✅ Integración con endpoints existentes
- ✅ Tests de integración pasando
- ✅ Documento `05-notification-events.md` (catálogo completo)

**Criterios de aceptación:**
- [ ] Nuevo pedido genera notificaciones correctas
- [ ] Cambios de estado notifican a destinatarios correctos
- [ ] Asignación de repartidor notifica a repartidor
- [ ] Admins reciben alertas importantes
- [ ] Tests: 100% pasando

---

### **FASE 4: Frontend Web (PWA)** 🌐

**Tiempo estimado:** 4-5 horas
**Agente responsable:** Aether (UI/UX)

**Tareas:**
1. Crear Service Worker `public/firebase-messaging-sw.js`
   - Inicializar Firebase Messaging
   - Manejar mensajes en background
   - Manejar clicks en notificaciones
2. Implementar `src/lib/fcm/firebase-messaging.ts`
   - Inicializar FCM en cliente
   - Solicitar permisos
   - Obtener token FCM
3. Implementar hook `src/hooks/use-fcm-token.ts`
   - Registrar token al montar componente
   - Manejar renovación de token
   - Eliminar token al cerrar sesión
4. Implementar componente `NotificationPermissionPrompt.tsx`
   - UI para solicitar permisos
   - Explicación clara del beneficio
   - shadcn/ui + Tailwind
5. Implementar manejadores de notificaciones
   - Foreground: mostrar toast
   - Background: navegación al hacer click
6. Integrar en layout principal
7. Escribir tests frontend (React Testing Library)

**Entregables:**
- ✅ Service Worker funcional
- ✅ Hook de registro de token
- ✅ UI de permisos
- ✅ Manejadores de notificaciones
- ✅ Tests frontend pasando
- ✅ Documento `03-frontend-web-pwa.md`

**Criterios de aceptación:**
- [ ] Usuario puede otorgar permisos de notificaciones
- [ ] Token FCM se registra en Firestore
- [ ] Notificaciones se reciben en foreground y background
- [ ] Click en notificación navega a página correcta
- [ ] Tests frontend: 100% pasando

---

### **FASE 5: Estadísticas y Monitoreo** 📊

**Tiempo estimado:** 2-3 horas
**Agente responsable:** Nexus (Backend) + Vanguard (Testing)

**Tareas:**
1. Implementar tracking de clicks
   - Actualizar stats al hacer click
2. Implementar dashboard de métricas (opcional)
   - Vista para admins en `/control/notificaciones`
   - Gráficas de envíos, entregas, clicks
3. Implementar logs y debugging
   - Logs estructurados de envíos
   - Alertas de errores
4. Implementar limpieza automática de tokens
   - Job que limpia tokens no usados en 90 días
5. Escribir tests completos
6. Documentación de monitoreo

**Entregables:**
- ✅ Sistema de estadísticas funcional
- ✅ Dashboard de métricas (opcional)
- ✅ Sistema de logs robusto
- ✅ Job de limpieza de tokens
- ✅ Tests completos

**Criterios de aceptación:**
- [ ] Estadísticas se actualizan correctamente
- [ ] Admins pueden ver métricas
- [ ] Tokens antiguos se limpian automáticamente
- [ ] Sistema de logs funcional

---

### **FASE 6: Android & iOS (Futura)** 📱

**Tiempo estimado:** 6-8 horas (cuando se requiera)
**Agente responsable:** Aire (DevOps)

**Tareas:**
1. Configurar FCM para Android
   - Agregar `google-services.json`
   - Configurar Firebase SDK en Android
   - Implementar recepción de notificaciones
2. Configurar FCM para iOS
   - Configurar APNs en Apple Developer
   - Agregar certificados a Firebase Console
   - Implementar recepción de notificaciones
3. Implementar deep linking
   - Navegar a pantalla específica al hacer click
4. Probar en dispositivos físicos
5. Documentación completa

**Entregables:**
- ✅ App Android recibe notificaciones
- ✅ App iOS recibe notificaciones
- ✅ Deep linking funcional
- ✅ Documento `04-android-ios-setup.md`

**Criterios de aceptación:**
- [ ] Notificaciones llegan a Android
- [ ] Notificaciones llegan a iOS
- [ ] Click abre app en pantalla correcta
- [ ] Tests en dispositivos reales

---

## 📋 Catálogo de Eventos y Notificaciones

### 🛒 Eventos de Pedidos (Clientes)

| Evento | Trigger | Destinatario | Título | Cuerpo | Acción Click |
|--------|---------|--------------|--------|--------|--------------|
| `order.created` | POST /api/pedidos | Cliente | "¡Pedido Confirmado!" | "Tu pedido #123 ha sido recibido. Total: $350 MXN" | `/mis-pedidos/123` |
| `order.preparing` | PATCH status | Cliente | "Estamos Preparando tu Pedido" | "Tu pedido #123 está siendo preparado" | `/mis-pedidos/123` |
| `order.driver_assigned` | Asignar repartidor | Cliente | "Repartidor Asignado" | "Juan está en camino con tu pedido" | `/mis-pedidos/123` |
| `order.in_delivery` | PATCH status | Cliente | "Pedido en Camino" | "Tu pedido está a 5 minutos de llegar" | `/mis-pedidos/123` |
| `order.delivered` | PATCH status | Cliente | "¡Pedido Entregado!" | "¡Disfruta tu comida! Califica tu experiencia" | `/mis-pedidos/123` |
| `order.cancelled` | PATCH status | Cliente | "Pedido Cancelado" | "Tu pedido #123 ha sido cancelado" | `/mis-pedidos/123` |
| `promotion.new` | Admin crea promo | Todos | "🔥 Nueva Promoción" | "20% de descuento en tacos hoy" | `/menu` |

---

### 🚗 Eventos de Repartidores

| Evento | Trigger | Destinatario | Título | Cuerpo | Acción Click |
|--------|---------|--------------|--------|--------|--------------|
| `driver.order_assigned` | Asignar pedido | Repartidor | "Nuevo Pedido Asignado" | "Tienes un nuevo pedido #123 - $350 MXN" | `/repartidor/pedidos/123` |
| `driver.order_ready` | Status = Preparando | Repartidor | "Pedido Listo" | "Pedido #123 listo para recoger" | `/repartidor/pedidos/123` |
| `driver.order_cancelled` | Cancelar pedido | Repartidor | "Pedido Cancelado" | "El pedido #123 ha sido cancelado" | `/repartidor/dashboard` |
| `driver.reminder` | Cron job | Repartidor | "Recordatorio" | "Tienes 2 pedidos pendientes de entregar" | `/repartidor/dashboard` |
| `driver.order_updated` | Admin modifica | Repartidor | "Pedido Actualizado" | "Cambio de dirección en pedido #123" | `/repartidor/pedidos/123` |

---

### 👨‍💼 Eventos de Administradores

| Evento | Trigger | Destinatario | Título | Cuerpo | Acción Click |
|--------|---------|--------------|--------|--------|--------------|
| `admin.new_order` | POST /api/pedidos | Admins | "Nuevo Pedido" | "Pedido #123 - $350 MXN - Juan Pérez" | `/control/pedidos?id=123` |
| `admin.order_unassigned` | Cron job (10 min) | Admins | "⚠️ Pedido Sin Asignar" | "Pedido #123 lleva 10 min sin repartidor" | `/control/pedidos?id=123` |
| `admin.driver_inactive` | Cron job | Admins | "⚠️ Repartidor Inactivo" | "Juan lleva 30 min sin actualizar ubicación" | `/control/repartidores` |
| `admin.low_stock` | Inventario bajo | Admins | "⚠️ Stock Bajo" | "Tortillas: quedan 5 unidades" | `/control/inventario` |
| `admin.high_traffic` | Métrica alcanzada | Admins | "📊 Mucho Tráfico" | "15 pedidos en la última hora" | `/control/pedidos` |

---

## 🧪 Estrategia de Testing

### Backend (Jest + Supertest) - 95%

**Archivos:**
- `backend/__tests__/fcm/fcm-service.test.js`
- `backend/__tests__/fcm/token-manager.test.js`
- `backend/__tests__/fcm/notification-builder.test.js`
- `backend/__tests__/fcm/stats-tracker.test.js`
- `backend/__tests__/fcm/fcm-routes.test.js`
- `backend/__tests__/triggers/order-notifications.test.js`
- `backend/__tests__/triggers/driver-notifications.test.js`

**Casos de prueba:**

1. **FCM Service:**
   - ✅ Envía notificación a un dispositivo correctamente
   - ✅ Envía notificación multicast (múltiples dispositivos)
   - ✅ Maneja tokens inválidos (elimina de Firestore)
   - ✅ Maneja errores de FCM (API caída, rate limit)
   - ✅ Actualiza estadísticas después de enviar

2. **Token Manager:**
   - ✅ Registra nuevo token correctamente
   - ✅ No duplica tokens si ya existe
   - ✅ Actualiza `lastUsed` al registrar token existente
   - ✅ Elimina token correctamente
   - ✅ Limpia tokens antiguos (>90 días)
   - ✅ Limita tokens por usuario (max 10)

3. **Notification Builder:**
   - ✅ Construye payload correcto para cada evento
   - ✅ Personaliza mensajes con variables (nombre, pedido, etc.)
   - ✅ Incluye data payload para deep linking
   - ✅ Maneja diferentes plataformas (web, android, ios)

4. **Triggers:**
   - ✅ Nuevo pedido notifica a cliente y admins
   - ✅ Cambio de estado notifica a cliente
   - ✅ Asignación de repartidor notifica a repartidor
   - ✅ Cancelación notifica a todos los involucrados
   - ✅ No envía notificaciones duplicadas

---

### Frontend (Jest + React Testing Library) - 90%

**Archivos:**
- `src/__tests__/fcm/use-fcm-token.test.ts`
- `src/__tests__/fcm/notification-handlers.test.ts`
- `src/__tests__/components/NotificationPermissionPrompt.test.tsx`

**Casos de prueba:**

1. **use-fcm-token hook:**
   - ✅ Solicita permisos al montar
   - ✅ Registra token en backend si permisos otorgados
   - ✅ Maneja permisos denegados correctamente
   - ✅ Renueva token si expira
   - ✅ Elimina token al cerrar sesión

2. **Notification Handlers:**
   - ✅ Muestra toast en foreground
   - ✅ Navega al hacer click en notificación
   - ✅ Actualiza estadísticas al hacer click
   - ✅ Maneja notificaciones sin payload

3. **NotificationPermissionPrompt:**
   - ✅ Renderiza UI correctamente
   - ✅ Solicita permisos al hacer click
   - ✅ Se oculta si permisos ya otorgados
   - ✅ Muestra error si permisos denegados

---

### E2E (Playwright) - 5%

**Archivo:** `e2e/fcm-notifications.spec.ts`

**Casos de prueba:**
- ✅ Usuario otorga permisos y recibe notificación de prueba
- ✅ Usuario hace pedido → Recibe notificación de confirmación
- ✅ Admin asigna repartidor → Repartidor recibe notificación
- ✅ Click en notificación navega a página correcta

---

## 📦 Dependencias a Instalar

### Backend

```bash
cd backend
# Firebase Admin SDK ya instalado, no requiere dependencias adicionales
```

**Justificación:**
- Firebase Admin SDK (`firebase-admin`) ya incluye soporte completo para FCM
- No se requieren librerías adicionales

---

### Frontend

```bash
npm install firebase
# Firebase ya instalado, solo requiere configuración de Messaging
```

**Justificación:**
- El paquete `firebase` ya incluye `firebase/messaging`
- Solo se requiere configurar y usar el módulo de messaging

---

## ✅ Criterios de Aceptación Global

El módulo se considerará completo cuando:

### Configuración
- [ ] FCM habilitado en Firebase Console
- [ ] VAPID key generada y configurada
- [ ] Colecciones `deviceTokens` y `notificationStats` creadas
- [ ] Security Rules configuradas y probadas

### Backend
- [ ] Servicio FCM puede enviar notificaciones
- [ ] Tokens se registran/eliminan correctamente
- [ ] Triggers implementados para todos los eventos
- [ ] Estadísticas se actualizan correctamente
- [ ] Tests backend: 100% pasando

### Frontend Web
- [ ] Usuario puede otorgar permisos de notificaciones
- [ ] Token FCM se registra en Firestore
- [ ] Notificaciones se reciben en foreground
- [ ] Notificaciones se reciben en background (service worker)
- [ ] Click en notificación navega a página correcta
- [ ] Tests frontend: 100% pasando

### Eventos
- [ ] Nuevo pedido notifica a cliente y admins
- [ ] Cambio de estado notifica a cliente
- [ ] Asignación de repartidor notifica a repartidor
- [ ] Cancelación notifica a todos los involucrados
- [ ] Promociones notifican a usuarios

### Calidad
- [ ] Documentación completa en `docs/03-modules/fcm-notifications/`
- [ ] Cobertura de tests >90% en backend
- [ ] Cobertura de tests >85% en frontend
- [ ] Sin errores en consola
- [ ] Funciona en Chrome, Firefox, Safari, Edge

### Plataformas (Fase 6 - Futura)
- [ ] Android: Notificaciones funcionan
- [ ] iOS: Notificaciones funcionan
- [ ] Deep linking configurado

---

## 🔒 Consideraciones de Seguridad

### 1. **Tokens FCM**
- ✅ Validar que el token pertenece al usuario autenticado
- ✅ No exponer tokens en logs públicos
- ✅ Limpiar tokens expirados periódicamente
- ✅ Limitar número de tokens por usuario (max 10)

### 2. **Permisos**
- ✅ Solo usuarios autenticados pueden registrar tokens
- ✅ Solo admins pueden ver estadísticas globales
- ✅ Usuarios solo pueden eliminar sus propios tokens

### 3. **Contenido de Notificaciones**
- ✅ No incluir información sensible (contraseñas, tarjetas)
- ✅ Validar input antes de construir mensaje
- ✅ Sanitizar strings para evitar XSS

### 4. **Rate Limiting**
- ✅ Limitar envíos por usuario/IP
- ✅ Prevenir spam de notificaciones
- ✅ Respetar límites de FCM (500 dispositivos por batch)

### 5. **Firestore Security Rules**

```javascript
// deviceTokens - Solo el usuario puede leer/escribir sus tokens
match /deviceTokens/{tokenId} {
  allow read: if request.auth != null &&
                 resource.data.userId == request.auth.uid;

  allow create: if request.auth != null &&
                   request.resource.data.userId == request.auth.uid;

  allow delete: if request.auth != null &&
                   resource.data.userId == request.auth.uid;

  // Admins pueden leer todos
  allow read: if isAdmin() || isSuperAdmin();
}

// notificationStats - Solo admins pueden leer
match /notificationStats/{statId} {
  allow read: if isAdmin() || isSuperAdmin();
  allow write: if false; // Solo backend puede escribir
}
```

---

## 📞 Soporte y Troubleshooting

### Problemas Comunes

**1. "Notificaciones no llegan en Web"**
- Causa: Service Worker no registrado o permisos denegados
- Solución: Verificar registro de SW, pedir permisos nuevamente

**2. "Token inválido después de reinstalar app"**
- Causa: Token FCM cambia al reinstalar
- Solución: Implementar renovación automática de token

**3. "Notificaciones duplicadas"**
- Causa: Múltiples tokens activos del mismo dispositivo
- Solución: Limpiar tokens duplicados al registrar nuevo

**4. "FCM retorna error 404"**
- Causa: Token expirado o dispositivo desinstalado
- Solución: Eliminar token de Firestore automáticamente

**5. "No llegan notificaciones en iOS Safari"**
- Causa: Safari no soporta Web Push (solo en iOS 16.4+)
- Solución: Usar app nativa iOS con APNs

---

## 📚 Recursos Adicionales

- **Firebase Cloud Messaging Docs**: https://firebase.google.com/docs/cloud-messaging
- **Web Push Protocol**: https://developers.google.com/web/fundamentals/push-notifications
- **FCM Admin SDK (Node.js)**: https://firebase.google.com/docs/cloud-messaging/admin/send-messages
- **Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Android Setup**: https://firebase.google.com/docs/cloud-messaging/android/client
- **iOS Setup**: https://firebase.google.com/docs/cloud-messaging/ios/client

---

## 📝 Changelog del Módulo

### Versión 1.0 (2025-10-26)
- ✅ Documento de arquitectura creado
- ✅ Decisiones técnicas documentadas
- ✅ Modelo de datos diseñado
- ✅ Plan de implementación en 6 fases
- ✅ Catálogo de eventos completo
- 📝 Pendiente: Implementación de código

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar** este documento con el equipo
2. **Comenzar FASE 1**: Configuración de Firebase Console
3. **Crear documento** `01-firebase-console-setup.md` con guía paso a paso
4. **Implementar** según las fases definidas

---

**Mantenido por**: Equipo de Desarrollo Al Chile FB
**Última actualización**: 2025-10-26
**Versión**: 1.0

**Siguiente paso**: Crear documento `01-firebase-console-setup.md` con la guía de configuración de Firebase Cloud Messaging en Firebase Console.
