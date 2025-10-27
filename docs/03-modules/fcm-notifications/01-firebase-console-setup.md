# 01 - Configuración de Firebase Console para FCM

## 📋 Información del Documento

**Agentes responsables**: Aire (DevOps) + Pyra (Firebase)
**Fecha de creación**: 2025-10-26
**Versión**: 1.0
**Estado**: ✅ FASE 1 - Configuración Base

---

## 🎯 Objetivo

Este documento proporciona instrucciones **paso a paso** para configurar Firebase Cloud Messaging (FCM) en Firebase Console para el proyecto **Al Chile FB**.

Al finalizar esta guía, tendrás:
- ✅ Firebase Cloud Messaging habilitado
- ✅ VAPID key generada para Web Push
- ✅ Variables de entorno configuradas
- ✅ Estructura de Firestore preparada para FCM

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:

- [ ] Acceso a Firebase Console: https://console.firebase.google.com
- [ ] Permisos de Editor o Propietario en el proyecto `studio-9824031244-700aa`
- [ ] Node.js y npm instalados localmente
- [ ] Repositorio de Al Chile FB clonado

---

## 🔧 PASO 1: Habilitar Firebase Cloud Messaging

### 1.1 Acceder al Proyecto en Firebase Console

1. Navega a: https://console.firebase.google.com
2. Selecciona el proyecto: **studio-9824031244-700aa**
3. En el menú lateral izquierdo, haz clic en **"Engagement"** (o **"Interactuar"**)
4. Selecciona **"Cloud Messaging"**

> **Nota**: Si es la primera vez que accedes, verás una pantalla de bienvenida explicando qué es FCM.

### 1.2 Habilitar Cloud Messaging API

Firebase Cloud Messaging requiere que habilites la API en Google Cloud Console.

**Pasos:**

1. En la página de Cloud Messaging, busca el botón o enlace que dice:
   - **"Enable Cloud Messaging API"** o
   - **"Habilitar Cloud Messaging API"**

2. Haz clic en el botón. Esto te redirigirá a Google Cloud Console.

3. En Google Cloud Console:
   - Verás la página de **"Cloud Messaging API"**
   - Haz clic en el botón azul **"Enable"** (Habilitar)
   - Espera unos segundos mientras se habilita la API

4. Una vez habilitada, regresa a Firebase Console

**¿Cómo verificar que está habilitada?**
- Regresa a Firebase Console > Cloud Messaging
- Deberías ver la interfaz de FCM sin mensajes de error
- Verás secciones como "Configuration", "Send test message", etc.

---

## 🔑 PASO 2: Generar VAPID Key para Web Push

Las VAPID keys (Voluntary Application Server Identification) son necesarias para enviar notificaciones push a navegadores web.

### 2.1 Acceder a la Configuración de Web Push

1. En Firebase Console, ve a **Cloud Messaging**
2. Desplázate hacia abajo hasta la sección **"Web configuration"** o **"Configuración web"**
3. Busca la subsección llamada **"Web Push certificates"** o **"Certificados Web Push"**

### 2.2 Generar el Par de Claves VAPID

1. En la sección "Web Push certificates", verás:
   - Un campo vacío o un mensaje que dice "No key pair generated"
   - Un botón **"Generate key pair"** (Generar par de claves)

2. Haz clic en **"Generate key pair"**

3. Firebase generará automáticamente:
   - Una clave pública (VAPID public key)
   - Una clave privada (guardada en los servidores de Firebase)

4. Copia la **clave pública** que aparece. Se verá algo así:
   ```
   BOkZ3xN_yL8v6K9j4XYz...  (cadena larga de caracteres)
   ```

### 2.3 Guardar la VAPID Key

**Guarda esta clave de forma segura**, la necesitarás en el PASO 4 para configurar variables de entorno.

> **⚠️ IMPORTANTE**:
> - NO compartas la clave pública en repositorios privados (aunque es "pública", es específica de tu proyecto)
> - NO regeneres la clave a menos que sea absolutamente necesario, ya que invalidará todos los tokens existentes

**¿Dónde anotar la clave temporalmente?**
- Copia la clave en un archivo temporal local (no en el repositorio)
- O déjala abierta en Firebase Console mientras configuras las variables de entorno

---

## 📊 PASO 3: Preparar Estructura de Firestore

En **Al Chile FB**, usaremos **lazy collection creation** - las colecciones se crearán automáticamente cuando el código backend las use por primera vez.

### 3.1 Colecciones que se Crearán Automáticamente

El módulo FCM utilizará estas colecciones en Firestore:

#### **1. `deviceTokens`** - Tokens de dispositivos

Almacena los tokens FCM de cada dispositivo registrado.

**Estructura del documento:**
```typescript
{
  id: string,                          // Auto-generado por Firestore
  userId: string,                      // UID del usuario
  token: string,                       // Token FCM del dispositivo
  platform: 'web' | 'android' | 'ios', // Plataforma
  deviceInfo: {
    userAgent: string,                 // Web: navigator.userAgent
    deviceModel: string,               // Móvil: modelo del dispositivo
    osVersion: string,                 // Versión del SO
    appVersion: string                 // Versión de la app
  },
  isActive: boolean,                   // true si el token es válido
  createdAt: Timestamp,                // Fecha de registro
  lastUsed: Timestamp,                 // Última vez que se usó
  expiresAt: Timestamp                 // Opcional: para invalidar tokens
}
```

**Índices necesarios** (ver PASO 3.2):
- `userId + platform + isActive`
- `token` (único)
- `lastUsed`

---

#### **2. `notificationStats`** - Estadísticas de notificaciones

Almacena contadores y métricas de notificaciones enviadas, entregadas y clicadas.

**Estructura del documento:**
```typescript
{
  id: string,                          // userId o 'global'
  totalSent: number,                   // Total enviadas
  totalDelivered: number,              // Total entregadas
  totalClicked: number,                // Total clicadas
  totalFailed: number,                 // Total fallidas
  byType: {
    [key: string]: {                   // 'order_status', 'driver_assigned', etc.
      sent: number,
      delivered: number,
      clicked: number
    }
  },
  byPlatform: {
    web: { sent: number, delivered: number, clicked: number },
    android: { sent: number, delivered: number, clicked: number },
    ios: { sent: number, delivered: number, clicked: number }
  },
  lastUpdated: Timestamp,
  period: string                       // 'daily', 'weekly', 'monthly'
}
```

**Índices necesarios** (ver PASO 3.2):
- `id` (automático)
- `lastUpdated`

---

### 3.2 Configurar Índices en Firestore

Los índices compuestos son necesarios para queries eficientes.

**Acción requerida**: Actualizar el archivo `firestore.indexes.json` en la raíz del proyecto.

Este paso se realizará en la **Tarea 3** del plan de implementación (ver abajo).

---

## ⚙️ PASO 4: Configurar Variables de Entorno

### 4.1 Variables de Backend (backend/.env)

El backend de Al Chile FB usa Firebase Admin SDK, que **ya incluye soporte para FCM**.

**NO se requieren variables adicionales** para el Admin SDK, ya que usa las credenciales existentes:
```bash
# Estas variables YA EXISTEN en backend/.env
FIREBASE_PROJECT_ID=studio-9824031244-700aa
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

**Variables opcionales de configuración** (agregar al final de `backend/.env`):

```bash
# ===== FCM CONFIGURATION =====
# Máximo de dispositivos por usuario (previene spam)
FCM_MAX_TOKENS_PER_USER=10

# Días antes de limpiar tokens no usados (cleanup automático)
FCM_TOKEN_CLEANUP_DAYS=90

# Tamaño de lote para envíos multicast (límite de FCM: 500)
FCM_BATCH_SIZE=500
```

**¿Dónde agregar estas variables?**
1. Abre el archivo: `backend/.env`
2. Ve al final del archivo
3. Agrega las 3 líneas de arriba
4. Guarda el archivo

> **Nota**: Estos valores son configuraciones opcionales. El módulo FCM funcionará sin ellas usando valores por defecto.

---

### 4.2 Variables de Frontend (proyecto raíz: .env.local)

El frontend necesita la **VAPID key** generada en el PASO 2.

**¿Dónde está el archivo `.env.local`?**
- Ubicación: `/home/beto/projects/alchilefb/.env.local` (raíz del proyecto)
- Si no existe, créalo

**Variables a agregar**:

```bash
# ===== FCM WEB PUSH CONFIGURATION =====
# VAPID Key generada en Firebase Console (PASO 2)
NEXT_PUBLIC_FCM_VAPID_KEY=BOkZ3xN_yL8v6K9j4XYz...  # Reemplaza con tu clave real
```

**Instrucciones:**
1. Abre o crea el archivo `.env.local` en la raíz del proyecto
2. Agrega la línea de arriba
3. Reemplaza `BOkZ3xN_yL8v6K9j4XYz...` con la VAPID key que copiaste en el PASO 2
4. Guarda el archivo

**¿Cómo se ve la VAPID key real?**
- Es una cadena larga de caracteres aleatorios
- Empieza con caracteres como `B`, `A`, o números
- Longitud aproximada: 88 caracteres
- Ejemplo ficticio: `BNxQ7kZ3R2mL8v6K9j4XYzPqWtUvSr1nMlKjHgFd...`

---

### 4.3 Actualizar .env.example (documentación)

Para que otros desarrolladores sepan qué variables configurar, actualiza `backend/.env.example`.

Este paso se realizará en la **Tarea 4** del plan de implementación (ver abajo).

---

## 🔒 PASO 5: Configurar Security Rules

Las Security Rules de Firestore protegen las colecciones contra acceso no autorizado.

Este paso se realizará en la **Tarea 2** del plan de implementación, donde se implementarán reglas completas y robustas para:
- `deviceTokens`: Solo el usuario puede leer/escribir sus propios tokens
- `notificationStats`: Solo admins pueden leer estadísticas

---

## ✅ PASO 6: Verificar la Configuración

### 6.1 Verificar FCM en Firebase Console

1. Ve a Firebase Console > Cloud Messaging
2. Deberías ver:
   - ✅ Cloud Messaging API habilitada
   - ✅ Web Push certificates configurados
   - ✅ Opción de "Send test message" disponible

### 6.2 Verificar Variables de Entorno

**Backend:**
```bash
cd backend
cat .env | grep FCM
```

Deberías ver:
```
FCM_MAX_TOKENS_PER_USER=10
FCM_TOKEN_CLEANUP_DAYS=90
FCM_BATCH_SIZE=500
```

**Frontend:**
```bash
cat .env.local | grep FCM
```

Deberías ver:
```
NEXT_PUBLIC_FCM_VAPID_KEY=BOkZ3xN_yL8v6K9j4XYz...
```

### 6.3 Verificar Estructura del Proyecto

```bash
ls -la docs/03-modules/fcm-notifications/
```

Deberías ver este documento:
```
01-firebase-console-setup.md  ✅
```

---

## 📝 CHECKLIST DE VALIDACIÓN

Antes de considerar completa la FASE 1, verifica:

### Configuración de Firebase Console
- [ ] Cloud Messaging API habilitada en Google Cloud Console
- [ ] VAPID key generada en Firebase Console
- [ ] VAPID key copiada de forma segura

### Variables de Entorno
- [ ] `backend/.env` tiene variables de configuración FCM (opcionales)
- [ ] `.env.local` tiene `NEXT_PUBLIC_FCM_VAPID_KEY` configurada
- [ ] VAPID key es correcta (88 caracteres aproximadamente)

### Documentación
- [ ] Este documento existe: `docs/03-modules/fcm-notifications/01-firebase-console-setup.md`
- [ ] Has leído y entendido la estructura de las colecciones de Firestore
- [ ] Entiendes que las colecciones se crearán automáticamente (lazy creation)

### Próximos Pasos
- [ ] Estás listo para implementar Security Rules (Tarea 2)
- [ ] Estás listo para configurar índices de Firestore (Tarea 3)

---

## 🔧 Tareas de Implementación Restantes

Las siguientes tareas completarán la FASE 1:

### ✅ Tarea 1: Documento de Configuración
**Estado**: ✅ COMPLETO (este documento)

---

### ⏳ Tarea 2: Implementar Security Rules
**Archivo**: `firestore.rules` (raíz del proyecto)

**Reglas a implementar**:
- Protección de `deviceTokens`: Solo el usuario puede leer/escribir sus tokens
- Protección de `notificationStats`: Solo admins pueden leer
- Validación de campos requeridos
- Prevención de escritura no autorizada

**Agente responsable**: Pyra (Firebase)

---

### ⏳ Tarea 3: Configurar Índices de Firestore
**Archivo**: `firestore.indexes.json` (raíz del proyecto)

**Índices a agregar**:
- `deviceTokens`: `userId + platform + isActive`
- `deviceTokens`: `token` (único)
- `deviceTokens`: `lastUsed`

**Agente responsable**: Pyra (Firebase)

---

### ⏳ Tarea 4: Documentar Variables en .env.example
**Archivo**: `backend/.env.example`

**Variables a documentar**:
- `FCM_MAX_TOKENS_PER_USER`
- `FCM_TOKEN_CLEANUP_DAYS`
- `FCM_BATCH_SIZE`

**Agente responsable**: Aire (DevOps)

---

### ⏳ Tarea 5: Script de Validación
**Archivo**: `backend/scripts/validate-fcm-config.js`

**Funcionalidad**:
- Verificar que FIREBASE_PROJECT_ID existe
- Verificar que las credenciales Admin SDK son válidas
- Verificar conectividad con FCM
- Opcional: Enviar notificación de prueba

**Agente responsable**: Nexus (Backend) + Aire (DevOps)

---

### ⏳ Tarea 6: Actualizar README del Módulo
**Archivo**: `docs/03-modules/fcm-notifications/README.md`

**Cambios**:
- Actualizar estado de FASE 1 a ✅ COMPLETO
- Marcar criterios de aceptación de FASE 1
- Actualizar fecha de última modificación

**Agente responsable**: Sentinel (Coordinador)

---

## 🚨 Troubleshooting

### Problema: No veo la opción "Cloud Messaging" en Firebase Console

**Causa**: Puede que esté en una ubicación diferente según la versión de Firebase Console.

**Solución**:
1. Busca en el menú lateral: **"Engagement"** o **"Interactuar"**
2. Si no lo encuentras, prueba con **"Build"** > **"Cloud Messaging"**
3. También puedes usar la búsqueda de Firebase Console (icono de lupa en la parte superior)

---

### Problema: No puedo habilitar Cloud Messaging API

**Causa**: Falta de permisos en Google Cloud Console.

**Solución**:
1. Verifica que tienes rol de **Editor** o **Propietario** en el proyecto Firebase
2. Verifica que tienes permisos en Google Cloud Console asociado
3. Si no tienes permisos, solicita al administrador del proyecto que:
   - Te otorgue permisos de Editor en Firebase Console
   - Te otorgue permisos de Editor en Google Cloud Console (proyecto: studio-9824031244-700aa)

---

### Problema: La VAPID key no aparece después de generarla

**Causa**: Posible error de red o timeout.

**Solución**:
1. Refresca la página de Firebase Console
2. Regresa a Cloud Messaging > Web Push certificates
3. Si la clave se generó correctamente, debería aparecer
4. Si no aparece, intenta generar una nueva clave

---

### Problema: No sé dónde está el archivo .env.local

**Causa**: El archivo no existe o está oculto.

**Solución**:
```bash
# Navegar a la raíz del proyecto
cd /home/beto/projects/alchilefb

# Verificar si existe
ls -la .env.local

# Si no existe, créalo
touch .env.local

# Agregar la variable FCM
echo "NEXT_PUBLIC_FCM_VAPID_KEY=TU_VAPID_KEY_AQUI" >> .env.local
```

---

## 📚 Recursos Adicionales

### Documentación Oficial
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- Web Push Protocol: https://developers.google.com/web/fundamentals/push-notifications
- VAPID Protocol: https://datatracker.ietf.org/doc/html/rfc8292

### Documentación del Proyecto
- Plan completo de FCM: `docs/03-modules/fcm-notifications/README.md`
- Agentes del proyecto: `AGENTS.md`

### Próximos Documentos
- `02-backend-implementation.md` - Implementación del backend FCM (FASE 2)
- `03-frontend-web-pwa.md` - Implementación del frontend Web/PWA (FASE 4)
- `04-android-ios-setup.md` - Configuración Android/iOS (FASE 6)
- `05-notification-events.md` - Catálogo de eventos y triggers (FASE 3)

---

## 📞 Soporte

Si encuentras problemas no documentados aquí:

1. Consulta la documentación oficial de Firebase Cloud Messaging
2. Revisa el documento `docs/03-modules/fcm-notifications/README.md`
3. Consulta con el agente **Sentinel** (Coordinador) para decisiones arquitectónicas
4. Consulta con el agente **Pyra** (Firebase) para problemas de Firestore/FCM

---

## ✅ Conclusión

Después de completar este documento, habrás configurado la base de Firebase Cloud Messaging para **Al Chile FB**.

**Estado actual**: ✅ FASE 1 - Configuración Base (Tarea 1 de 6)

**Próximos pasos**:
1. Implementar Security Rules (Tarea 2)
2. Configurar índices de Firestore (Tarea 3)
3. Documentar variables de entorno (Tarea 4)
4. Crear script de validación (Tarea 5)
5. Actualizar README del módulo (Tarea 6)

Una vez completadas todas las tareas, la FASE 1 estará completa y podrás proceder con la **FASE 2: Backend - Infraestructura Core**.

---

**Mantenido por**: Equipo de Desarrollo Al Chile FB
**Agentes**: Aire (DevOps) + Pyra (Firebase)
**Última actualización**: 2025-10-26
**Versión**: 1.0
