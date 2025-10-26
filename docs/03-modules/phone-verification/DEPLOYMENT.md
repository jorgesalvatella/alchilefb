# Deployment - Verificación de Teléfono

Checklist completo y guía de deployment para llevar el módulo de verificación de teléfono a producción.

---

## Pre-Deployment Checklist

### 1. Verificación de Código

- [ ] **Tests Backend**: Todos los tests pasando (31/31)
  ```bash
  cd backend
  npm test verification/
  ```

- [ ] **Tests Frontend**: Todos los tests pasando (8/9)
  ```bash
  npm test verificar-telefono
  ```

- [ ] **Linting**: Sin errores de ESLint
  ```bash
  npm run lint
  ```

- [ ] **Build**: Proyecto compila sin errores
  ```bash
  npm run build
  ```

---

### 2. Firestore Setup

#### A. Crear Índices Compuestos

**Importante:** Los índices deben crearse ANTES de deployar para evitar errores en producción.

**Método 1: Firebase Console**

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Seleccionar proyecto
3. Ir a Firestore Database > Indexes
4. Crear índices manualmente:

**Índice 1: Búsqueda de Código Activo**
```
Collection: verificationCodes
Fields:
  - userId: Ascending
  - verified: Ascending
  - invalidated: Ascending
  - createdAt: Descending
```

**Índice 2: Rate Limiting**
```
Collection: verificationCodes
Fields:
  - userId: Ascending
  - createdAt: Descending
```

**Método 2: firestore.indexes.json (Recomendado)**

Crear archivo `firestore.indexes.json` en la raíz del proyecto:

```json
{
  "indexes": [
    {
      "collectionGroup": "verificationCodes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "verified", "order": "ASCENDING" },
        { "fieldPath": "invalidated", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "verificationCodes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**Deployar índices:**
```bash
firebase deploy --only firestore:indexes
```

**Verificar creación:**
```bash
# Los índices pueden tardar 5-10 minutos en construirse
# Verificar en Firebase Console > Firestore > Indexes
```

---

#### B. Actualizar Security Rules

**Archivo:** `firestore.rules`

Agregar reglas para `verificationCodes` y actualizar `users`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ... reglas existentes ...

    // NUEVO: verificationCodes - Solo backend
    match /verificationCodes/{codeId} {
      allow read, write: if false;
    }

    // MODIFICADO: users - Proteger phoneVerified
    match /users/{userId} {
      allow read: if request.auth.uid == userId;

      allow update: if request.auth.uid == userId &&
        !('phoneVerified' in request.resource.data.diff(resource.data).affectedKeys()) &&
        !('phoneVerifiedAt' in request.resource.data.diff(resource.data).affectedKeys());

      allow create: if request.auth.uid == userId;
    }

  }
}
```

**Deployar rules:**
```bash
firebase deploy --only firestore:rules
```

**Verificar rules:**
```bash
# Probar en Firebase Console > Firestore > Rules > Playground
```

---

### 3. Variables de Entorno

#### Backend (Node.js)

Verificar que las siguientes variables estén configuradas:

**Archivo:** `backend/.env` (desarrollo) o variables del servidor (producción)

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=alchilefb-production
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@alchilefb-production.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=alchilefb-production.appspot.com

# Server
PORT=8080
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://alchilefb.com,https://www.alchilefb.com
```

**Checklist:**
- [ ] `FIREBASE_PROJECT_ID` apunta a proyecto de producción
- [ ] `FIREBASE_PRIVATE_KEY` es correcta (incluye \n para saltos de línea)
- [ ] `ALLOWED_ORIGINS` incluye dominio de producción
- [ ] Service Account tiene permisos correctos

---

#### Frontend (Next.js)

**Archivo:** `.env.production` o variables de Vercel/hosting

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=alchilefb-production.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=alchilefb-production
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=alchilefb-production.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Backend API
NEXT_PUBLIC_API_URL=https://api.alchilefb.com
```

**Checklist:**
- [ ] Variables con prefijo `NEXT_PUBLIC_` son públicas
- [ ] `NEXT_PUBLIC_API_URL` apunta al backend de producción
- [ ] Firebase config apunta a proyecto de producción

---

### 4. Migración de Datos

Si hay usuarios existentes, ejecutar migración para agregar campos `phoneVerified`:

**Script:** `scripts/migrate-add-phone-verified.js`

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateUsers() {
  console.log('🔄 Iniciando migración...');

  const usersSnapshot = await db.collection('users').get();
  const batch = db.batch();
  let count = 0;

  usersSnapshot.forEach((doc) => {
    const data = doc.data();

    if (data.phoneVerified === undefined) {
      batch.update(doc.ref, {
        phoneVerified: false
      });
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Migrados ${count} usuarios`);
}

migrateUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });
```

**Ejecutar migración:**
```bash
node scripts/migrate-add-phone-verified.js
```

**Verificar migración:**
```bash
# En Firebase Console, verificar que usuarios tienen phoneVerified: false
```

---

### 5. Testing Manual en Staging

Antes de deployar a producción, probar el flujo completo en staging:

#### A. Flujo Happy Path

1. [ ] **Registro de usuario nuevo**
   - Registrar usuario con email, contraseña y teléfono
   - Verificar que `phoneVerified = false`

2. [ ] **Intentar hacer pedido sin verificar**
   - Agregar producto al carrito
   - Ir a checkout
   - Click "Finalizar Pedido"
   - Verificar error 403 y redirección a `/verificar-telefono`

3. [ ] **Generar código de verificación**
   - Verificar que código de 6 dígitos se muestra en pantalla
   - Verificar timer cuenta regresiva desde 10:00

4. [ ] **Verificar código correcto**
   - Ingresar código mostrado
   - Verificar mensaje "Teléfono verificado"
   - Verificar redirección a `/pago`
   - Verificar que `phoneVerified = true` en Firestore

5. [ ] **Hacer pedido verificado**
   - Finalizar pedido
   - Verificar que se crea exitosamente

---

#### B. Flujo de Errores

1. [ ] **Código incorrecto (1er intento)**
   - Ingresar código incorrecto
   - Verificar mensaje "Te quedan 2 intentos"

2. [ ] **Código incorrecto (3er intento)**
   - Ingresar código incorrecto 3 veces
   - Verificar mensaje "Máximo de intentos alcanzado"
   - Verificar que código se invalida

3. [ ] **Generar nuevo código**
   - Click "Nuevo Código"
   - Verificar que se genera nuevo código
   - Verificar que código anterior se invalida

4. [ ] **Código expirado**
   - Esperar 10 minutos (o modificar `expiresAt` en BD)
   - Intentar verificar
   - Verificar mensaje "Código expirado"

5. [ ] **Rate limiting**
   - Generar 6 códigos en menos de 1 hora
   - Verificar mensaje "Demasiados intentos"

---

#### C. Testing de Componentes UI

1. [ ] **VerificationCodeDisplay**
   - Verificar que muestra 6 dígitos claramente
   - Verificar estilos (gradiente, bordes)

2. [ ] **VerificationCodeInput**
   - Verificar auto-focus al siguiente input
   - Verificar backspace regresa al input anterior
   - Verificar paste de 6 dígitos funciona
   - Verificar solo acepta números

3. [ ] **VerificationTimer**
   - Verificar formato MM:SS
   - Verificar cuenta regresiva cada segundo
   - Verificar callback onExpire al llegar a 00:00

---

### 6. Monitoreo y Logging

#### A. Backend Logging

Agregar logging en endpoints:

```javascript
// backend/verification/phone-verification-routes.js

router.post('/generate-code', authMiddleware, async (req, res) => {
  const userId = req.user.uid;

  console.log(`[VERIFICATION] Generando código para usuario: ${userId}`);

  try {
    // ... código existente ...

    console.log(`[VERIFICATION] Código generado exitosamente: ${userId}`);
    res.status(200).json({ success: true, code, expiresAt });

  } catch (error) {
    console.error(`[VERIFICATION] Error generando código para ${userId}:`, error);
    res.status(500).json({ error: 'Error al generar código' });
  }
});
```

#### B. Firebase Analytics (Opcional)

Agregar eventos de analytics:

```typescript
// src/app/verificar-telefono/page.tsx

import { logEvent } from 'firebase/analytics';
import { analytics } from '@/firebase/config';

// Al generar código
logEvent(analytics, 'verification_code_generated');

// Al verificar código
logEvent(analytics, 'phone_verified', {
  method: 'visual_code'
});

// Al fallar verificación
logEvent(analytics, 'verification_failed', {
  attempts: attempts
});
```

---

### 7. Rollback Plan

En caso de problemas en producción, tener plan de rollback:

#### Opción A: Desactivar Validación (Temporal)

**Backend:** Comentar validación en `pedidos.js`

```javascript
// backend/pedidos.js

router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;

    // TEMPORAL: Desactivar validación de teléfono
    // if (!userDoc.data().phoneVerified) {
    //   return res.status(403).json({
    //     error: 'phone_not_verified',
    //     message: 'Debes verificar tu teléfono antes de hacer un pedido'
    //   });
    // }

    // ... resto del código
  }
});
```

**Deploy rápido:**
```bash
# Deployar solo backend
git add backend/pedidos.js
git commit -m "hotfix: Desactivar validación de teléfono temporalmente"
git push
```

#### Opción B: Rollback Completo

```bash
# Volver a commit anterior
git revert HEAD
git push

# Re-deployar
npm run deploy
```

---

## Deployment Steps

### 1. Backend (Node.js + Express)

```bash
# 1. Ir a directorio backend
cd backend

# 2. Instalar dependencias
npm install --production

# 3. Verificar tests
npm test

# 4. Iniciar servidor
PORT=8080 node app.js
```

**PM2 (Recomendado):**
```bash
pm2 start app.js --name alchilefb-backend
pm2 save
pm2 startup
```

---

### 2. Frontend (Next.js)

#### Opción A: Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod

# 3. Configurar variables de entorno en Vercel Dashboard
```

#### Opción B: Build Manual

```bash
# 1. Build producción
npm run build

# 2. Iniciar servidor
npm start
```

---

### 3. Firebase (Firestore Rules + Indexes)

```bash
# 1. Login
firebase login

# 2. Seleccionar proyecto
firebase use production

# 3. Deploy rules e indexes
firebase deploy --only firestore

# Verificar en Firebase Console
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Backend
curl https://api.alchilefb.com/health
# Expected: { "status": "ok" }

# Frontend
curl https://alchilefb.com
# Expected: 200 OK
```

### 2. Smoke Tests

**Test 1: Generar código**
```bash
curl -X POST https://api.alchilefb.com/api/verification/generate-code \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: { "success": true, "code": "123456", ... }
```

**Test 2: Verificar código**
```bash
curl -X POST https://api.alchilefb.com/api/verification/verify-code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
# Expected: { "success": true }
```

**Test 3: Pedido sin verificar**
```bash
curl -X POST https://api.alchilefb.com/api/pedidos \
  -H "Authorization: Bearer UNVERIFIED_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [], "total": 100}'
# Expected: 403 { "error": "phone_not_verified" }
```

---

### 3. Monitoreo Primera Hora

Después del deployment, monitorear durante 1 hora:

- [ ] **Logs de errores**: Verificar que no hay errores 500
- [ ] **Tasa de éxito**: Verificar que códigos se generan correctamente
- [ ] **Performance**: Verificar tiempos de respuesta < 500ms
- [ ] **Firestore**: Verificar que índices funcionan (sin warnings)
- [ ] **Analytics**: Verificar que eventos se registran

---

## Troubleshooting

### Error: "Missing index in Firestore"

**Causa:** Índices no creados antes de deployment

**Solución:**
1. Ir a Firebase Console > Firestore > Indexes
2. Click en link del error para auto-crear índice
3. Esperar 5-10 minutos para que se construya

---

### Error: "Failed to verify phone code"

**Causa:** Security rules bloquean escritura en `users`

**Solución:**
1. Verificar que backend usa Admin SDK (no Client SDK)
2. Verificar que `phoneVerified` se actualiza via backend, no frontend

---

### Error: "Too many requests"

**Causa:** Rate limiting activado

**Solución:**
1. Verificar que rate limit está configurado correctamente (5/hora)
2. Limpiar códigos antiguos en Firestore si es necesario

---

## Métricas de Éxito

Después de 1 semana en producción, verificar:

- **Tasa de verificación**: > 80% usuarios verifican teléfono
- **Tasa de error**: < 5% errores en verificación
- **Tiempo promedio**: < 2 minutos para completar verificación
- **Códigos generados**: Promedio 1.2 códigos por usuario (pocos reintentos)

---

**Última actualización:** 2025-10-26
**Versión:** 1.0
**Preparado por:** Sentinel (Coordinador)
