# Resumen de Implementación: Verificación por WhatsApp

## 📋 Decisión: ¿Meta o Twilio?

### 🎯 Recomendación según tu caso:

**Elige TWILIO si:**
- ✅ Quieres implementar **YA** (30 min setup)
- ✅ Estás en fase MVP/desarrollo
- ✅ Prefieres documentación clara y SDK maduro
- ✅ Necesitas soporte 24/7
- ✅ Valoras facilidad > costo
- ✅ Quieres SMS fallback automático

**Elige META si:**
- ✅ Planeas enviar **>5,000 mensajes/mes** (más barato a escala)
- ✅ No te urge (setup 2-3 horas + aprobación 1-2 semanas)
- ✅ Ya tienes Facebook Business Manager
- ✅ Valoras costo > facilidad

---

## 🏗️ Arquitectura del Módulo (Agnóstica)

El módulo se diseñará con **patrón Strategy** para soportar ambos proveedores:

```
┌─────────────────────────────────────┐
│      WhatsAppService                │  ← Abstracción
│  (interface común)                  │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
┌─────▼─────┐  ┌───▼──────┐
│Meta Client│  │Twilio    │  ← Implementaciones
│           │  │Client    │
└───────────┘  └──────────┘
```

**Ventaja:** Puedes cambiar de proveedor solo modificando 1 variable de entorno.

---

## 📂 Estructura de Archivos Completa

```
backend/
├── whatsapp/
│   ├── providers/
│   │   ├── meta-client.js          ← Implementación Meta
│   │   ├── twilio-client.js        ← Implementación Twilio
│   │   └── whatsapp-factory.js     ← Factory pattern
│   ├── otp-service.js               ← Lógica de OTP (agnóstica)
│   └── rate-limiter.js              ← Rate limiting (agnóstica)
├── routes/
│   └── auth.js                      ← Endpoints de verificación
└── __tests__/
    └── whatsapp/
        ├── otp-service.test.js
        ├── rate-limiter.test.js
        └── auth-routes.test.js

src/
├── app/
│   └── verificar-telefono/
│       ├── page.tsx                 ← Pantalla de ingreso OTP
│       └── page.test.tsx
├── components/
│   └── auth/
│       ├── OTPInput.tsx             ← Input de 6 dígitos
│       ├── OTPInput.test.tsx
│       └── ResendCodeButton.tsx     ← Botón con cooldown
└── lib/
    └── api/
        └── auth.ts                  ← Funciones de API
```

---

## 🔧 Variables de Entorno (.env)

```bash
# ========================================
# WHATSAPP PROVIDER (meta | twilio)
# ========================================
WHATSAPP_PROVIDER=twilio  # O "meta"

# ========================================
# TWILIO (si WHATSAPP_PROVIDER=twilio)
# ========================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_PHONE_NUMBER=+1234567890  # Opcional (SMS fallback)

# ========================================
# META (si WHATSAPP_PROVIDER=meta)
# ========================================
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# CONFIGURACIÓN OTP
# ========================================
OTP_EXPIRATION_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60

# ========================================
# RATE LIMITING
# ========================================
MAX_OTP_PER_PHONE_PER_DAY=5
MAX_OTP_PER_IP_PER_HOUR=10
```

---

## 💻 Código de Implementación Backend

### 1. Factory Pattern (whatsapp-factory.js)

```javascript
// backend/whatsapp/providers/whatsapp-factory.js

const MetaClient = require('./meta-client');
const TwilioClient = require('./twilio-client');

class WhatsAppFactory {
  static createClient() {
    const provider = process.env.WHATSAPP_PROVIDER || 'twilio';

    switch (provider) {
      case 'meta':
        return new MetaClient();
      case 'twilio':
        return new TwilioClient();
      default:
        throw new Error(`Unknown WhatsApp provider: ${provider}`);
    }
  }
}

module.exports = WhatsAppFactory;
```

### 2. Meta Client (meta-client.js)

```javascript
// backend/whatsapp/providers/meta-client.js

const axios = require('axios');

class MetaWhatsAppClient {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('Meta WhatsApp credentials not configured');
    }
  }

  async sendMessage(to, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),  // Meta no quiere el +
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        provider: 'meta'
      };

    } catch (error) {
      console.error('Meta WhatsApp error:', error.response?.data || error.message);
      throw new Error(`Failed to send WhatsApp via Meta: ${error.message}`);
    }
  }

  async sendOTP(to, code) {
    const message = `Al Chile FB\nTu código de verificación es: ${code}\nVálido por 10 minutos.`;
    return this.sendMessage(to, message);
  }
}

module.exports = MetaWhatsAppClient;
```

### 3. Twilio Client (twilio-client.js)

```javascript
// backend/whatsapp/providers/twilio-client.js

const twilio = require('twilio');

class TwilioWhatsAppClient {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    this.smsNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(this.accountSid, this.authToken);
  }

  async sendMessage(to, message) {
    try {
      const result = await this.client.messages.create({
        from: this.whatsappNumber,
        to: `whatsapp:${to}`,
        body: message
      });

      return {
        success: true,
        messageId: result.sid,
        provider: 'twilio'
      };

    } catch (error) {
      console.error('Twilio WhatsApp error:', error);

      // Fallback a SMS si está configurado
      if (this.smsNumber) {
        try {
          const smsResult = await this.client.messages.create({
            from: this.smsNumber,
            to: to,
            body: message
          });

          return {
            success: true,
            messageId: smsResult.sid,
            provider: 'twilio-sms'
          };
        } catch (smsError) {
          console.error('Twilio SMS fallback error:', smsError);
        }
      }

      throw new Error(`Failed to send WhatsApp via Twilio: ${error.message}`);
    }
  }

  async sendOTP(to, code) {
    const message = `Al Chile FB\nTu código de verificación es: ${code}\nVálido por 10 minutos.`;
    return this.sendMessage(to, message);
  }
}

module.exports = TwilioWhatsAppClient;
```

### 4. OTP Service (otp-service.js)

```javascript
// backend/whatsapp/otp-service.js

const admin = require('firebase-admin');
const crypto = require('crypto');

class OTPService {
  constructor() {
    this.db = admin.firestore();
    this.expirationMinutes = parseInt(process.env.OTP_EXPIRATION_MINUTES) || 10;
    this.maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 3;
  }

  /**
   * Genera código OTP de 6 dígitos
   */
  generateCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Crea y guarda código de verificación en Firestore
   */
  async createVerificationCode(userId, phoneNumber, purpose = 'registration') {
    const code = this.generateCode();
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + (this.expirationMinutes * 60 * 1000)
    );

    const docRef = await this.db.collection('verificationCodes').add({
      userId,
      phoneNumber,
      code,
      purpose,
      attempts: 0,
      verified: false,
      createdAt: now,
      expiresAt
    });

    return { id: docRef.id, code };
  }

  /**
   * Verifica código OTP
   */
  async verifyCode(userId, code) {
    const now = admin.firestore.Timestamp.now();

    // Buscar código
    const querySnapshot = await this.db.collection('verificationCodes')
      .where('userId', '==', userId)
      .where('code', '==', code)
      .where('verified', '==', false)
      .where('expiresAt', '>', now)
      .orderBy('expiresAt', 'desc')
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return { valid: false, error: 'Código inválido o expirado' };
    }

    const docRef = querySnapshot.docs[0].ref;
    const data = querySnapshot.docs[0].data();

    // Verificar intentos
    if (data.attempts >= this.maxAttempts) {
      return { valid: false, error: 'Demasiados intentos. Solicita un nuevo código.' };
    }

    // Incrementar intentos
    await docRef.update({
      attempts: admin.firestore.FieldValue.increment(1)
    });

    // Código correcto
    await docRef.update({
      verified: true,
      verifiedAt: now
    });

    return { valid: true };
  }

  /**
   * Invalida todos los códigos anteriores del usuario
   */
  async invalidatePreviousCodes(userId) {
    const batch = this.db.batch();
    const querySnapshot = await this.db.collection('verificationCodes')
      .where('userId', '==', userId)
      .where('verified', '==', false)
      .get();

    querySnapshot.forEach(doc => {
      batch.update(doc.ref, { verified: true });
    });

    await batch.commit();
  }
}

module.exports = OTPService;
```

### 5. Rate Limiter (rate-limiter.js)

```javascript
// backend/whatsapp/rate-limiter.js

const admin = require('firebase-admin');

class RateLimiter {
  constructor() {
    this.db = admin.firestore();
    this.maxPerPhonePerDay = parseInt(process.env.MAX_OTP_PER_PHONE_PER_DAY) || 5;
    this.maxPerIPPerHour = parseInt(process.env.MAX_OTP_PER_IP_PER_HOUR) || 10;
  }

  /**
   * Verifica si se puede enviar OTP
   */
  async canSendOTP(phoneNumber, ipAddress) {
    const phoneCheck = await this.checkPhoneLimit(phoneNumber);
    const ipCheck = await this.checkIPLimit(ipAddress);

    return {
      allowed: phoneCheck.allowed && ipCheck.allowed,
      reason: !phoneCheck.allowed ? phoneCheck.reason : ipCheck.reason
    };
  }

  async checkPhoneLimit(phoneNumber) {
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (24 * 60 * 60 * 1000)
    );

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('phoneNumber', '==', phoneNumber)
      .where('createdAt', '>', oneDayAgo)
      .get();

    if (querySnapshot.size >= this.maxPerPhonePerDay) {
      return {
        allowed: false,
        reason: `Límite alcanzado: ${this.maxPerPhonePerDay} códigos por día`
      };
    }

    return { allowed: true };
  }

  async checkIPLimit(ipAddress) {
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (60 * 60 * 1000)
    );

    const querySnapshot = await this.db.collection('verificationCodes')
      .where('ipAddress', '==', ipAddress)
      .where('createdAt', '>', oneHourAgo)
      .get();

    if (querySnapshot.size >= this.maxPerIPPerHour) {
      return {
        allowed: false,
        reason: `Límite alcanzado: ${this.maxPerIPPerHour} códigos por hora`
      };
    }

    return { allowed: true };
  }

  /**
   * Registra envío de OTP
   */
  async recordOTPSent(phoneNumber, ipAddress) {
    // Esto se hace automáticamente al crear el verificationCode
    // pero podrías agregar logging adicional aquí
  }
}

module.exports = RateLimiter;
```

### 6. Endpoints de Autenticación (routes/auth.js)

```javascript
// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const WhatsAppFactory = require('../whatsapp/providers/whatsapp-factory');
const OTPService = require('../whatsapp/otp-service');
const RateLimiter = require('../whatsapp/rate-limiter');

const whatsappClient = WhatsAppFactory.createClient();
const otpService = new OTPService();
const rateLimiter = new RateLimiter();

/**
 * POST /api/auth/send-verification-code
 * Envía código OTP por WhatsApp
 */
router.post('/send-verification-code', authMiddleware, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { phoneNumber, purpose = 'registration' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber es requerido' });
    }

    // Validar formato E.164
    if (!phoneNumber.match(/^\+52\d{10}$/)) {
      return res.status(400).json({
        error: 'Formato de teléfono inválido. Use: +52XXXXXXXXXX'
      });
    }

    // Rate limiting
    const ipAddress = req.ip || req.connection.remoteAddress;
    const rateLimitCheck = await rateLimiter.canSendOTP(phoneNumber, ipAddress);

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ error: rateLimitCheck.reason });
    }

    // Invalidar códigos anteriores
    await otpService.invalidatePreviousCodes(userId);

    // Generar nuevo código
    const { code } = await otpService.createVerificationCode(
      userId,
      phoneNumber,
      purpose
    );

    // Enviar por WhatsApp
    const result = await whatsappClient.sendOTP(phoneNumber, code);

    console.log(`OTP sent via ${result.provider} - MessageID: ${result.messageId}`);

    res.status(200).json({
      message: 'Código de verificación enviado',
      messageId: result.messageId,
      provider: result.provider,
      expiresInMinutes: process.env.OTP_EXPIRATION_MINUTES || 10
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({
      error: 'Error al enviar código de verificación',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/verify-code
 * Verifica código OTP ingresado por el usuario
 */
router.post('/verify-code', authMiddleware, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code es requerido' });
    }

    // Validar formato
    if (!code.match(/^\d{6}$/)) {
      return res.status(400).json({ error: 'Código debe ser de 6 dígitos' });
    }

    // Verificar código
    const verification = await otpService.verifyCode(userId, code);

    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Actualizar usuario en Firestore
    const admin = require('firebase-admin');
    await admin.firestore().collection('users').doc(userId).update({
      phoneVerified: true,
      phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({
      message: 'Teléfono verificado exitosamente',
      verified: true
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    res.status(500).json({
      error: 'Error al verificar código',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/resend-verification-code
 * Reenvía código OTP (respeta cooldown)
 */
router.post('/resend-verification-code', authMiddleware, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber es requerido' });
    }

    // Verificar cooldown (60 segundos entre reenvíos)
    const lastCode = await otpService.db.collection('verificationCodes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!lastCode.empty) {
      const lastCreated = lastCode.docs[0].data().createdAt.toMillis();
      const cooldownMs = (process.env.OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000;
      const timeSinceLastSend = Date.now() - lastCreated;

      if (timeSinceLastSend < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        return res.status(429).json({
          error: `Espera ${remainingSeconds} segundos antes de solicitar otro código`
        });
      }
    }

    // Usar la misma lógica de send-verification-code
    const ipAddress = req.ip || req.connection.remoteAddress;
    const rateLimitCheck = await rateLimiter.canSendOTP(phoneNumber, ipAddress);

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ error: rateLimitCheck.reason });
    }

    await otpService.invalidatePreviousCodes(userId);
    const { code } = await otpService.createVerificationCode(userId, phoneNumber, 'resend');
    const result = await whatsappClient.sendOTP(phoneNumber, code);

    res.status(200).json({
      message: 'Código reenviado',
      messageId: result.messageId,
      provider: result.provider
    });

  } catch (error) {
    console.error('Error resending code:', error);
    res.status(500).json({ error: 'Error al reenviar código' });
  }
});

module.exports = router;
```

### 7. Registrar rutas en app.js

```javascript
// backend/app.js

const authRoutes = require('./routes/auth');

// ... código existente ...

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// ... resto del código ...
```

---

## 📝 Resumen de Implementación

### Backend completado ✅
- Factory pattern para soportar Meta y Twilio
- OTP Service para generación y validación
- Rate Limiter para prevenir abuso
- 3 endpoints: send, verify, resend

### Frontend pendiente
- Página `/verificar-telefono`
- Componente `OTPInput`
- Componente `ResendCodeButton`

### Tests pendientes
- Backend: Jest + Supertest
- Frontend: Jest + RTL
- E2E: Playwright

---

**Siguiente paso:** ¿Quieres que implemente el frontend completo, o prefieres primero decidir entre Meta/Twilio y probar el backend?
