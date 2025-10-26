# 🚀 Inicio Rápido: Verificación por WhatsApp con Twilio

## ✅ Backend Implementado

El backend ya está completamente implementado y listo para usar. Solo necesitas configurar Twilio.

---

## 📋 Pasos para Empezar (30 minutos)

### 1. Crear Cuenta Twilio (5 min)

1. Ve a: https://www.twilio.com/try-twilio
2. Crea cuenta con tu email
3. Verifica tu teléfono con el código SMS
4. Recibes **$15 USD gratis** para pruebas ✅

---

### 2. Obtener Credenciales (2 min)

En https://console.twilio.com/ verás:

```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: (click "Show" para ver)
```

**Copia ambos valores** 📋

---

### 3. Configurar Sandbox WhatsApp (5 min)

1. Ve a: **Messaging → Try it out → Send a WhatsApp message**
2. Verás instrucciones como:

```
Save +1 415 523 8886 to your contacts
Send this message on WhatsApp:
  join chair-dozen
```

3. Hazlo desde tu WhatsApp
4. Recibirás confirmación ✅

---

### 4. Configurar Variables de Entorno (2 min)

Edita `backend/.env`:

```bash
# Agregar al final del archivo:

WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

### 5. Probar Configuración (5 min)

```bash
cd backend
node test-twilio-whatsapp.js +52XXXXXXXXXX
```

Reemplaza `+52XXXXXXXXXX` con TU número (el que hizo join al sandbox).

**Deberías recibir un WhatsApp con un código de 6 dígitos** 🎉

---

## 🎯 API Endpoints Disponibles

El backend ya tiene 3 endpoints listos:

### 1. Enviar Código OTP

```http
POST /api/auth/send-verification-code
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "phoneNumber": "+52XXXXXXXXXX",
  "purpose": "registration"
}
```

**Respuesta:**
```json
{
  "message": "Código de verificación enviado",
  "messageId": "SMxxxx...",
  "provider": "twilio-whatsapp",
  "expiresInMinutes": 10
}
```

---

### 2. Verificar Código

```http
POST /api/auth/verify-code
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "code": "123456"
}
```

**Respuesta:**
```json
{
  "message": "Teléfono verificado exitosamente",
  "verified": true
}
```

---

### 3. Reenviar Código

```http
POST /api/auth/resend-verification-code
Authorization: Bearer <firebase-token>
Content-Type: application/json

{
  "phoneNumber": "+52XXXXXXXXXX"
}
```

**Respuesta:**
```json
{
  "message": "Código reenviado",
  "messageId": "SMxxxx...",
  "provider": "twilio-whatsapp"
}
```

---

## 🔧 Firestore: Estructura de Datos

### Nueva Colección: `verificationCodes`

El backend automáticamente crea documentos así:

```javascript
{
  userId: "abc123",
  phoneNumber: "+52XXXXXXXXXX",
  code: "123456",
  purpose: "registration",
  attempts: 0,
  verified: false,
  createdAt: Timestamp,
  expiresAt: Timestamp,
  ipAddress: "192.168.1.1"
}
```

### Campo Agregado a `users`:

```javascript
{
  // ... campos existentes ...
  phoneVerified: true,        // ← NUEVO
  phoneVerifiedAt: Timestamp  // ← NUEVO
}
```

---

## 📊 Rate Limiting Automático

El backend ya protege contra abuso:

- ✅ Máximo **5 códigos por teléfono en 24 horas**
- ✅ Máximo **10 códigos por IP en 1 hora**
- ✅ **Cooldown de 60 segundos** entre reenvíos

Si se excede:
```json
{
  "error": "Límite alcanzado: máximo 5 códigos por día",
  "limitType": "phone"
}
```

---

## 🔐 Seguridad Implementada

- ✅ Códigos de 6 dígitos aleatorios (crypto.randomInt)
- ✅ Expiración de 10 minutos
- ✅ Máximo 3 intentos de verificación
- ✅ Código se invalida después de uso exitoso
- ✅ Códigos anteriores se invalidan al generar nuevo

---

## 🎨 Frontend: PENDIENTE

El backend está listo. Ahora necesitas implementar:

1. **Página `/verificar-telefono`**
   - Input de 6 dígitos
   - Timer de 10 minutos
   - Botón "Reenviar código" (cooldown 60 seg)

2. **Actualizar `/registro`**
   - Redirigir a `/verificar-telefono` después de crear usuario

3. **Actualizar `withAuth.tsx`**
   - Detectar `phoneVerified: false`
   - Redirigir a `/verificar-telefono`

Ver documentación completa en: `docs/03-modules/whatsapp-verification/`

---

## 🔄 Cambiar a Meta Después (Opcional)

Cuando quieras cambiar a Meta WhatsApp API:

1. Configura Meta (ver `01-meta-api-setup.md`)
2. Agrega credenciales a `.env`:
   ```bash
   WHATSAPP_PROVIDER=meta  # ← Cambia esta línea
   WHATSAPP_ACCESS_TOKEN=EAAxxxx...
   WHATSAPP_PHONE_NUMBER_ID=123456...
   # etc.
   ```
3. ¡Listo! El código automáticamente usa Meta ✅

---

## ❓ Troubleshooting

### "Sandbox: This person hasn't joined"

**Solución:** El número destino debe hacer join al sandbox:
1. Guardar `+1 415 523 8886` en WhatsApp
2. Enviar: `join <tu-sandbox-code>`

### "Invalid OAuth Token"

**Solución:** Verifica que `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` sean correctos.

### "Number not authorized"

**Solución:** En cuenta trial, agrega el número en:
https://console.twilio.com/us1/develop/phone-numbers/manage/verified

---

## 📚 Documentación Completa

- **Arquitectura**: `docs/03-modules/whatsapp-verification/README.md`
- **Setup Twilio**: `docs/03-modules/whatsapp-verification/01-twilio-setup.md`
- **Setup Meta**: `docs/03-modules/whatsapp-verification/01-meta-api-setup.md`
- **Comparativa**: `docs/03-modules/whatsapp-verification/COMPARISON-META-VS-TWILIO.md`
- **Implementación**: `docs/03-modules/whatsapp-verification/02-implementation-summary.md`

---

## ✅ Checklist de Implementación

### Backend ✅ (COMPLETADO)
- [x] Twilio Client
- [x] Meta Client
- [x] WhatsApp Factory (cambio de proveedor fácil)
- [x] OTP Service
- [x] Rate Limiter
- [x] 3 Endpoints REST
- [x] Integrado en app.js
- [x] Script de prueba

### Firestore (Manual)
- [ ] Crear índices en Firestore Console:
  - `verificationCodes`: `userId` + `verified` + `expiresAt`
  - `verificationCodes`: `phoneNumber` + `createdAt`

### Frontend (Pendiente)
- [ ] Página `/verificar-telefono`
- [ ] Componente `OTPInput`
- [ ] Componente `ResendCodeButton`
- [ ] Actualizar `/registro`
- [ ] Actualizar `withAuth.tsx`

### Testing (Pendiente)
- [ ] Tests backend (Jest + Supertest)
- [ ] Tests frontend (Jest + RTL)
- [ ] Tests E2E (Playwright)

---

**¿Listo para probarlo?** 🚀

```bash
cd backend
node test-twilio-whatsapp.js +52XXXXXXXXXX
```

¡Deberías recibir un WhatsApp en segundos! 🎉
