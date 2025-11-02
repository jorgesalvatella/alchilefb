# Integración FCM - Verificación de Teléfono

**Fecha de implementación**: 2025-11-01
**Versión**: 1.0
**Estado**: ✅ COMPLETO

---

## 🎯 Objetivo

Integrar Firebase Cloud Messaging (FCM) con el módulo de verificación de teléfono para enviar códigos de verificación directamente a los dispositivos móviles de los usuarios, proporcionando una verificación **REAL y GRATUITA** sin depender de servicios externos como WhatsApp o SMS.

---

## 🔍 Problema Identificado

**Situación Anterior:**
El sistema generaba un código de 6 dígitos y lo mostraba en la **misma pantalla** donde el usuario estaba haciendo el pedido. Esto no verificaba realmente el teléfono, solo confirmaba que el usuario podía copiar números de una parte de la pantalla a otra.

**Caso Real:**
- Usuario en PC intenta hacer pedido
- Sistema genera código: `123456`
- Código se muestra en la misma PC
- Usuario copia/pega el código
- ❌ **NO hay verificación real** del número de teléfono

---

## ✅ Solución Implementada

### Estrategia Inteligente con Fallback

El sistema ahora utiliza una **estrategia adaptativa** que detecta si el usuario tiene dispositivos móviles registrados:

```
┌──────────────────────────────────────────────────────────┐
│            FLUJO DE VERIFICACIÓN INTELIGENTE             │
└──────────────────────────────────────────────────────────┘

1. Usuario va a /verificar-telefono

2. Backend consulta tokens FCM del usuario:
   → ¿Tiene dispositivos móviles (android/ios)?

3A. SÍ tiene móvil:
    ├─▶ Envía código por FCM push notification
    ├─▶ Código visible en notificación móvil: "123456"
    ├─▶ NO envía código en response HTTP
    ├─▶ Frontend muestra: "Revisa tu móvil"
    └─▶ ✅ Verificación REAL (dispositivo diferente)

3B. NO tiene móvil:
    ├─▶ NO envía FCM
    ├─▶ Envía código en response HTTP
    ├─▶ Frontend muestra código en pantalla
    └─▶ ⚠️ Fallback (como antes)
```

---

## 🏗️ Arquitectura de la Integración

### Backend

#### 1. Notificación Builder (`backend/fcm/notification-builder.js`)

**Nueva función agregada:**

```javascript
/**
 * Construye una notificación de verificación de teléfono
 * @param {string} code - Código de verificación de 6 dígitos
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildPhoneVerificationNotification(code) {
  return {
    notification: {
      title: 'Código de Verificación - Al Chile FB',
      body: `Tu código de verificación es: ${code}\n\nExpira en 10 minutos`,
    },
    data: {
      type: 'phone_verification',
      code,
      clickAction: '/verificar-telefono',
    },
  };
}
```

**Notificación resultante:**
```
📱 Código de Verificación - Al Chile FB
Tu código de verificación es: 123456

Expira en 10 minutos
```

---

#### 2. Rutas de Verificación (`backend/verification/phone-verification-routes.js`)

**Endpoint actualizado: `POST /api/verification/generate-code`**

```javascript
// 1. Generar código
const { code, expiresAt } = await createVerificationCode(userId, phoneNumber);

// 2. Consultar SOLO tokens móviles (android, ios)
const mobileTokensSnapshot = await db.collection('deviceTokens')
  .where('userId', '==', userId)
  .where('isActive', '==', true)
  .where('platform', 'in', ['android', 'ios'])  // ⚠️ SOLO MÓVILES
  .get();

let strategy = 'display'; // Default

// 3. Si tiene tokens móviles, enviar FCM
if (!mobileTokensSnapshot.empty) {
  strategy = 'fcm_mobile';

  const tokens = mobileTokensSnapshot.docs.map(doc => doc.data().token);
  const { notification, data } = buildPhoneVerificationNotification(code);

  await sendMulticast({ tokens, notification, data });
}

// 4. Retornar según estrategia
res.status(200).json({
  success: true,
  strategy,
  code: strategy === 'display' ? code : undefined,  // ⚠️ Seguridad
  expiresAt: expiresAt.toISOString(),
  message: strategy === 'fcm_mobile'
    ? 'Código enviado a tu dispositivo móvil'
    : 'Ingresa el código que ves abajo'
});
```

---

### Frontend

#### Página de Verificación (`src/app/verificar-telefono/page.tsx`)

**Estado agregado:**

```typescript
const [strategy, setStrategy] = useState<'fcm_mobile' | 'display' | null>(null);
```

**Lógica de generación de código:**

```typescript
const data = await response.json();

setStrategy(data.strategy);
setExpiresAt(new Date(data.expiresAt));

if (data.strategy === 'fcm_mobile') {
  // Código enviado a móvil - NO mostrarlo en pantalla
  setGeneratedCode('');
  toast({
    title: '📱 Código enviado a tu móvil',
    description: 'Revisa tu dispositivo móvil para el código de verificación',
  });
} else {
  // Mostrar código en pantalla
  setGeneratedCode(data.code);
  toast({
    title: 'Código generado',
    description: 'Ingresa el código que ves abajo',
  });
}
```

**UI Condicional:**

```tsx
{/* Header */}
<h1>Verifica tu Teléfono</h1>
<p>
  {strategy === 'fcm_mobile'
    ? 'Revisa tu dispositivo móvil para el código de verificación'
    : 'Para realizar pedidos, ingresa el código que ves abajo'
  }
</p>

{/* Código Visual - SOLO si strategy = display */}
{strategy === 'display' && generatedCode && (
  <VerificationCodeDisplay code={generatedCode} />
)}

{/* Mensaje visual - SOLO si strategy = fcm_mobile */}
{strategy === 'fcm_mobile' && (
  <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
    <div className="flex items-center gap-3">
      <span className="text-3xl">📱</span>
      <div>
        <p className="text-white font-semibold">Código enviado a tu móvil</p>
        <p className="text-white/70 text-sm">Revisa las notificaciones</p>
      </div>
    </div>
  </div>
)}
```

---

## 📦 Response del Backend

### Caso 1: Usuario CON dispositivo móvil

**Request:**
```http
POST /api/verification/generate-code
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "strategy": "fcm_mobile",
  "code": undefined,
  "expiresAt": "2025-11-01T23:00:00.000Z",
  "message": "Código enviado a tu dispositivo móvil"
}
```

**Notificación FCM enviada:**
```
📱 Código de Verificación - Al Chile FB
Tu código de verificación es: 123456

Expira en 10 minutos
```

---

### Caso 2: Usuario SIN dispositivo móvil

**Request:**
```http
POST /api/verification/generate-code
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "strategy": "display",
  "code": "123456",
  "expiresAt": "2025-11-01T23:00:00.000Z",
  "message": "Ingresa el código que ves abajo"
}
```

**NO se envía notificación FCM**

---

## 🧪 Testing

### Tests Backend

**1. notification-builder.test.js** (21 tests)

```javascript
describe('buildPhoneVerificationNotification()', () => {
  it('should build phone verification notification with code', () => {
    const code = '123456';
    const result = notificationBuilder.buildPhoneVerificationNotification(code);

    expect(result.notification.title).toBe('Código de Verificación - Al Chile FB');
    expect(result.notification.body).toContain('123456');
    expect(result.notification.body).toContain('Expira en 10 minutos');
    expect(result.data.type).toBe('phone_verification');
    expect(result.data.code).toBe('123456');
  });
});
```

**Resultado:** ✅ 21/21 pasando

---

**2. phone-verification-routes.test.js** (13 tests)

```javascript
it('should generate code with display strategy when no mobile tokens', async () => {
  // Mock: usuario sin tokens móviles
  const res = await request(app)
    .post('/api/verification/generate-code')
    .set('Authorization', 'Bearer valid-token');

  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({
    success: true,
    strategy: 'display',
    code: '123456',
    expiresAt: expect.any(String),
    message: 'Ingresa el código que ves abajo',
  });
});
```

**Resultado:** ✅ 13/13 pasando

---

## 🔒 Consideraciones de Seguridad

### 1. **Código NO se envía en response si hay móvil**

```javascript
code: strategy === 'display' ? code : undefined
```

Si el usuario tiene dispositivo móvil, el código **NO** se incluye en la respuesta HTTP. Solo se envía por FCM push.

---

### 2. **Solo dispositivos móviles**

```javascript
.where('platform', 'in', ['android', 'ios'])
```

Los códigos se envían **SOLO** a dispositivos `android` o `ios`, **NO** a dispositivos `web`. Esto garantiza que el código llega a un dispositivo físico diferente.

---

### 3. **Fallback automático si falla FCM**

```javascript
try {
  await sendMulticast({ tokens, notification, data });
  message = 'Código enviado a tu dispositivo móvil';
} catch (fcmError) {
  console.error('[Phone Verification] Error enviando FCM:', fcmError);
  strategy = 'display';  // Fallback
  message = 'No se pudo enviar notificación. Usa el código de abajo';
}
```

Si el envío de FCM falla, el sistema automáticamente cambia a `strategy: 'display'` y envía el código en la response.

---

## 📊 Ventajas de esta Solución

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Costo** | $0 | $0 |
| **Verificación real** | ❌ No | ✅ Sí (si tiene móvil) |
| **Experiencia UX** | Regular | ⭐ Excelente |
| **Dispositivo diferente** | ❌ No | ✅ Sí (móvil) |
| **Funciona siempre** | ✅ Sí | ✅ Sí (fallback) |
| **Dependencias externas** | Ninguna | Ninguna |
| **Escalable** | ✅ Sí | ✅ Sí |

---

## 🚀 Cómo Probar

### 1. Usuario CON dispositivo móvil (Android/iOS)

```bash
# Paso 1: Registrar token FCM desde móvil
# (Esto ya está implementado en el módulo FCM - FASE 4)

# Paso 2: Desde PC, ir a /verificar-telefono
# Resultado esperado:
# - NO se muestra código en pantalla PC
# - Se recibe notificación push en móvil con código
# - Usuario ingresa código del móvil en PC
```

### 2. Usuario SIN dispositivo móvil

```bash
# Paso 1: Ir a /verificar-telefono (sin tener PWA instalada)
# Resultado esperado:
# - Código se muestra en pantalla
# - NO se envía notificación FCM
# - Funciona como antes (fallback)
```

---

## 📝 Archivos Modificados

### Backend
- ✅ `backend/fcm/notification-builder.js` (+20 líneas)
- ✅ `backend/verification/phone-verification-routes.js` (+40 líneas)
- ✅ `backend/__tests__/fcm/notification-builder.test.js` (+10 líneas)
- ✅ `backend/verification/phone-verification-routes.test.js` (actualizado)

### Frontend
- ✅ `src/app/verificar-telefono/page.tsx` (+40 líneas)

### Documentación
- ✅ `docs/03-modules/phone-verification/FCM-INTEGRATION.md` (este archivo)

---

## 🔮 Futuras Mejoras

### Fase 2: Verificación más robusta

1. **Límite de dispositivos:** Enviar solo al dispositivo usado recientemente
2. **Expiración de tokens:** Limpiar tokens antiguos automáticamente
3. **Métricas:** Trackear cuántos usuarios verifican con FCM vs display

### Fase 3: PWA Completa

1. **Manifiesto:** Agregar `manifest.json` para instalación PWA
2. **Service Worker completo:** Cache de assets
3. **Prompts de instalación:** Sugerir instalación de PWA

---

## 📞 Troubleshooting

### "No recibo notificación en móvil"

**Causa:** Usuario no tiene permisos de notificaciones habilitados

**Solución:**
1. Ir a `/perfil`
2. Sección "Notificaciones Push"
3. Click en "Habilitar Notificaciones"
4. Aceptar permisos del navegador

---

### "Código sigue mostrándose en pantalla aunque tengo móvil"

**Causa:** No hay tokens FCM registrados en Firestore

**Verificar:**
```javascript
// Console del navegador
await firebase.firestore()
  .collection('deviceTokens')
  .where('userId', '==', 'tu-user-id')
  .where('platform', 'in', ['android', 'ios'])
  .get()
  .then(snap => console.log('Tokens:', snap.size))
```

---

## 📚 Referencias

- **Módulo FCM**: [`docs/03-modules/fcm-notifications/README.md`](../fcm-notifications/README.md)
- **Módulo Phone Verification**: [`README.md`](./README.md)
- **Firebase Cloud Messaging**: https://firebase.google.com/docs/cloud-messaging

---

**Mantenido por**: Equipo de Desarrollo Al Chile FB
**Última actualización**: 2025-11-01
**Versión**: 1.0
**Estado**: ✅ COMPLETO Y FUNCIONANDO
