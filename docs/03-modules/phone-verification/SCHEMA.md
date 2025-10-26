# Modelo de Datos - Verificación de Teléfono

Documentación completa del modelo de datos y esquemas de Firestore para el módulo de verificación de teléfono.

---

## Colecciones Firestore

### 1. Colección `verificationCodes` (NUEVA)

**Descripción:** Almacena códigos de verificación temporales generados para los usuarios.

**Ruta:** `/verificationCodes/{codeId}`

**Esquema:**

```typescript
interface VerificationCode {
  // Identificación
  id: string;                        // Auto-generado por Firestore
  userId: string;                    // UID del usuario (Firebase Auth)
  phoneNumber: string;               // Número de teléfono en formato +52XXXXXXXXXX

  // Código de verificación
  code: string;                      // Código de 6 dígitos (ej: "123456")

  // Control de seguridad
  attempts: number;                  // Número de intentos de verificación (0-3)
  verified: boolean;                 // true si fue verificado exitosamente
  invalidated: boolean;              // true si fue invalidado manualmente

  // Timestamps
  createdAt: Timestamp;              // Fecha de creación del código
  expiresAt: Timestamp;              // Fecha de expiración (createdAt + 10 minutos)
  verifiedAt?: Timestamp;            // Fecha de verificación exitosa (opcional)

  // Metadata opcional (para auditoría)
  ipAddress?: string;                // IP del solicitante
  userAgent?: string;                // User agent del navegador
}
```

**Ejemplo de documento:**

```json
{
  "id": "vC9kL2mN4oP5qR6s",
  "userId": "abc123xyz789",
  "phoneNumber": "+525512345678",
  "code": "123456",
  "attempts": 0,
  "verified": false,
  "invalidated": false,
  "createdAt": {
    "_seconds": 1729950000,
    "_nanoseconds": 0
  },
  "expiresAt": {
    "_seconds": 1729950600,
    "_nanoseconds": 0
  }
}
```

**Reglas de negocio:**

- Expiración: 10 minutos desde `createdAt`
- Máximo 3 intentos de verificación
- Solo puede existir 1 código activo por usuario a la vez
- Códigos anteriores se invalidan al generar uno nuevo
- Rate limiting: máximo 5 códigos por usuario en 1 hora

---

### 2. Modificación: Colección `users`

**Descripción:** Se agregan campos de verificación a la colección existente de usuarios.

**Ruta:** `/users/{userId}`

**Campos NUEVOS:**

```typescript
interface User {
  // ... campos existentes ...
  id: string;
  email: string;
  phoneNumber: string;              // Ya existe: +52XXXXXXXXXX

  // CAMPOS NUEVOS para verificación
  phoneVerified: boolean;            // true si el usuario verificó su teléfono
  phoneVerifiedAt?: Timestamp;       // Fecha de verificación (opcional)

  // ... resto de campos existentes ...
}
```

**Ejemplo de documento (campos relevantes):**

```json
{
  "id": "abc123xyz789",
  "email": "usuario@example.com",
  "phoneNumber": "+525512345678",
  "phoneVerified": true,
  "phoneVerifiedAt": {
    "_seconds": 1729950300,
    "_nanoseconds": 0
  },
  "createdAt": {
    "_seconds": 1729900000,
    "_nanoseconds": 0
  }
}
```

**Reglas de negocio:**

- `phoneVerified` se inicializa en `false` al registrar usuario
- Solo puede ser actualizado a `true` por el backend (via endpoint verify-code)
- Frontend no puede modificar `phoneVerified` directamente (security rules)
- Una vez verificado, permanece `true` (no se revierte)

---

## Índices de Firestore

Para optimizar las consultas, se deben crear los siguientes índices compuestos:

### Índice 1: Búsqueda de Código Activo

**Colección:** `verificationCodes`

**Campos:**
- `userId` (Ascending)
- `verified` (Ascending)
- `invalidated` (Ascending)
- `createdAt` (Descending)

**Propósito:** Encontrar el código activo más reciente de un usuario

**Query que lo usa:**
```javascript
db.collection('verificationCodes')
  .where('userId', '==', userId)
  .where('verified', '==', false)
  .where('invalidated', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(1)
```

### Índice 2: Rate Limiting

**Colección:** `verificationCodes`

**Campos:**
- `userId` (Ascending)
- `createdAt` (Descending)

**Propósito:** Contar códigos generados en la última hora

**Query que lo usa:**
```javascript
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
db.collection('verificationCodes')
  .where('userId', '==', userId)
  .where('createdAt', '>', oneHourAgo)
  .orderBy('createdAt', 'desc')
```

### Índice 3: Limpieza de Códigos Expirados (Opcional)

**Colección:** `verificationCodes`

**Campos:**
- `expiresAt` (Ascending)
- `verified` (Ascending)

**Propósito:** Encontrar códigos expirados para limpieza batch

**Query que lo usa:**
```javascript
const now = new Date();
db.collection('verificationCodes')
  .where('expiresAt', '<', now)
  .where('verified', '==', false)
```

---

## Firestore Security Rules

### Reglas para `verificationCodes`

```javascript
// verificationCodes - Solo backend puede leer/escribir
match /verificationCodes/{codeId} {
  // Nadie puede leer directamente (solo backend via Admin SDK)
  allow read: if false;

  // Nadie puede escribir directamente (solo backend via Admin SDK)
  allow write: if false;
}
```

**Justificación:**
- Los códigos de verificación son sensibles y solo deben ser manejados por el backend
- Frontend obtiene el código via API endpoint, no directamente de Firestore
- Previene manipulación del código por parte del cliente

### Reglas para `users` (Modificadas)

```javascript
// users - Proteger campo phoneVerified
match /users/{userId} {
  // Usuarios pueden leer su propio documento
  allow read: if request.auth.uid == userId;

  // Usuarios pueden actualizar su documento, EXCEPTO phoneVerified
  allow update: if request.auth.uid == userId &&
                   !('phoneVerified' in request.resource.data.diff(resource.data).affectedKeys()) &&
                   !('phoneVerifiedAt' in request.resource.data.diff(resource.data).affectedKeys());

  // Solo backend puede actualizar phoneVerified (via Admin SDK)
}
```

**Justificación:**
- Usuarios no pueden marcar su propio teléfono como verificado
- Solo el backend (via Admin SDK) puede actualizar `phoneVerified` después de validar el código
- Previene bypass de verificación por parte del cliente

---

## Migraciones de Datos

### Migración: Agregar Campos a Usuarios Existentes

Si hay usuarios existentes antes de implementar este módulo, se debe ejecutar una migración:

```javascript
// scripts/migrate-add-phone-verified.js

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateUsers() {
  const usersSnapshot = await db.collection('users').get();

  const batch = db.batch();
  let count = 0;

  usersSnapshot.forEach((doc) => {
    const data = doc.data();

    // Solo actualizar si no tiene el campo phoneVerified
    if (data.phoneVerified === undefined) {
      batch.update(doc.ref, {
        phoneVerified: false  // Por defecto, usuarios existentes no están verificados
      });
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Migrados ${count} usuarios`);
}

migrateUsers().catch(console.error);
```

**Comando de ejecución:**
```bash
node scripts/migrate-add-phone-verified.js
```

**Alternativa:** Verificar automáticamente usuarios con teléfono registrado

```javascript
// Si queremos marcar como verificados a usuarios existentes con teléfono
if (data.phoneVerified === undefined) {
  const phoneVerified = !!data.phoneNumber; // true si tiene teléfono
  batch.update(doc.ref, {
    phoneVerified,
    phoneVerifiedAt: phoneVerified ? admin.firestore.FieldValue.serverTimestamp() : null
  });
}
```

---

## Consultas Comunes

### 1. Obtener Código Activo de Usuario

```javascript
async function getActiveCode(userId) {
  const snapshot = await db.collection('verificationCodes')
    .where('userId', '==', userId)
    .where('verified', '==', false)
    .where('invalidated', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}
```

### 2. Verificar si Usuario Tiene Teléfono Verificado

```javascript
async function isPhoneVerified(userId) {
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return false;
  }

  return userDoc.data().phoneVerified === true;
}
```

### 3. Invalidar Códigos Anteriores

```javascript
async function invalidatePreviousCodes(userId) {
  const snapshot = await db.collection('verificationCodes')
    .where('userId', '==', userId)
    .where('verified', '==', false)
    .where('invalidated', '==', false)
    .get();

  const batch = db.batch();
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { invalidated: true });
  });

  await batch.commit();
  return snapshot.size;
}
```

### 4. Contar Códigos Generados en Última Hora (Rate Limiting)

```javascript
async function countRecentCodes(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const snapshot = await db.collection('verificationCodes')
    .where('userId', '==', userId)
    .where('createdAt', '>', admin.firestore.Timestamp.fromDate(oneHourAgo))
    .get();

  return snapshot.size;
}
```

### 5. Limpiar Códigos Expirados (Batch Job)

```javascript
async function cleanupExpiredCodes() {
  const now = new Date();

  const snapshot = await db.collection('verificationCodes')
    .where('expiresAt', '<', admin.firestore.Timestamp.fromDate(now))
    .where('verified', '==', false)
    .limit(500) // Procesar en lotes
    .get();

  const batch = db.batch();
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  return snapshot.size;
}
```

---

## Estados de Código de Verificación

Un código de verificación puede estar en uno de los siguientes estados:

| Estado | `verified` | `invalidated` | `expiresAt` | Descripción |
|--------|-----------|--------------|-------------|-------------|
| **Activo** | `false` | `false` | > now | Código válido, esperando verificación |
| **Verificado** | `true` | `false` | any | Código usado exitosamente |
| **Invalidado** | `false` | `true` | any | Código invalidado manualmente (nuevo código generado) |
| **Expirado** | `false` | `false` | < now | Código expiró (>10 min), no usado |
| **Fallido** | `false` | `true` | any | Código invalidado por 3 intentos fallidos |

**Diagrama de estados:**

```
     [CREADO]
        ↓
    [ACTIVO] ────→ [VERIFICADO] (success: true)
        ↓
        ├─→ [INVALIDADO] (nuevo código generado)
        ├─→ [EXPIRADO] (>10 minutos)
        └─→ [FALLIDO] (3 intentos incorrectos)
```

---

## Consideraciones de Rendimiento

### 1. TTL (Time To Live)

Firestore no tiene TTL automático. Se recomienda:

**Opción A: Limpieza programada (Firebase Functions)**
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.cleanupExpiredCodes = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const snapshot = await admin.firestore()
      .collection('verificationCodes')
      .where('expiresAt', '<', now)
      .limit(500)
      .get();

    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Deleted ${snapshot.size} expired codes`);
  });
```

**Opción B: Limpieza manual periódica**
```bash
# Ejecutar script cada 6 horas (cron)
0 */6 * * * node scripts/cleanup-expired-codes.js
```

### 2. Tamaño de Colección

Estimación de crecimiento:

- 100 usuarios/día generan código → 100 documentos/día
- Sin limpieza: ~3,000 documentos/mes
- Con limpieza cada 24h: ~300-500 documentos constantes

**Recomendación:** Implementar limpieza automática después de 1 día (no solo 10 minutos).

---

## Validaciones de Esquema

### En Código (TypeScript)

```typescript
// src/types/verification.ts

import { z } from 'zod';

export const VerificationCodeSchema = z.object({
  id: z.string(),
  userId: z.string().min(1),
  phoneNumber: z.string().regex(/^\+52\d{10}$/),
  code: z.string().regex(/^\d{6}$/),
  attempts: z.number().int().min(0).max(3),
  verified: z.boolean(),
  invalidated: z.boolean(),
  createdAt: z.date(),
  expiresAt: z.date(),
  verifiedAt: z.date().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

export type VerificationCode = z.infer<typeof VerificationCodeSchema>;
```

### En Backend (JavaScript)

```javascript
// backend/verification/validators.js

function validateCode(code) {
  return /^\d{6}$/.test(code);
}

function validatePhoneNumber(phoneNumber) {
  return /^\+52\d{10}$/.test(phoneNumber);
}

module.exports = { validateCode, validatePhoneNumber };
```

---

**Última actualización:** 2025-10-26
**Versión:** 1.0
**Mantenido por:** Nexus (Backend)
