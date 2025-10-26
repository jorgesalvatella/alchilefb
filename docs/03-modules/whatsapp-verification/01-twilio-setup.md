# Guía de Configuración: Twilio WhatsApp API

## 📋 Información

**Agente responsable**: Aire (DevOps)
**Tiempo estimado**: 30-45 minutos
**Dificultad**: Baja
**Pre-requisitos**:
- Tarjeta de crédito (para activar cuenta, pero hay créditos gratuitos de $15 USD)
- Número de teléfono para verificación de cuenta

---

## 🎯 Objetivo

Configurar Twilio WhatsApp API para poder enviar mensajes de verificación OTP a usuarios de la aplicación Al Chile FB.

---

## 💰 Costo Estimado

- **Créditos iniciales**: $15 USD gratis al crear cuenta
- **WhatsApp (México)**: $0.0055 USD por mensaje
- **SMS fallback (México)**: $0.0155 USD por SMS
- **Sin cuota mensual** en cuenta de prueba
- **Cuenta de pago**: $20 USD/mes + consumo

**Ejemplo:**
- 1000 OTP por WhatsApp = $5.50 USD
- 1000 OTP por SMS = $15.50 USD

---

## 📊 Resumen del Proceso

```
1. Crear cuenta Twilio (5 min)
2. Verificar identidad (10 min)
3. Obtener credenciales (2 min)
4. Configurar WhatsApp Sandbox (5 min)
5. Probar envío de mensajes (5 min)
6. (Producción) Aprobar número propio (1-2 semanas)
```

---

## 🚀 PASO 1: Crear Cuenta Twilio

1. Ve a: https://www.twilio.com/try-twilio
2. Completa el formulario:
   - First Name: Tu nombre
   - Last Name: Tu apellido
   - Email: tu email
   - Password: contraseña segura

3. Clic en **"Start your free trial"**

4. Verifica tu email (Twilio envía link de confirmación)

5. **Verificar tu número de teléfono:**
   - Ingresa tu número: `+52 XXX XXX XXXX`
   - Recibirás código por SMS
   - Ingresa el código

6. **Cuestionario de uso:**
   - ¿Qué productos usarás? → **"Messaging"**
   - ¿Qué lenguaje? → **"Node.js"**
   - ¿Qué vas a construir? → **"Two-factor authentication"**

**Resultado:** Cuenta creada con **$15 USD de crédito gratis** ✅

---

## 🚀 PASO 2: Obtener Credenciales

### 2.1 Dashboard Principal

Al entrar, verás tu **Twilio Console**: https://console.twilio.com/

En la sección **"Account Info"** encontrarás:

```
Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: [hidden] → Click "Show" para ver
```

**Copiar ambos valores**

### 2.2 Guardar en Variables de Entorno

Crea/actualiza `backend/.env`:

```bash
# TWILIO CREDENTIALS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Se configurará en los siguientes pasos:
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox por defecto
TWILIO_PHONE_NUMBER=+1234567890               # Para SMS fallback (opcional)

# CONFIGURACIÓN OTP
OTP_EXPIRATION_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60

# RATE LIMITING
MAX_OTP_PER_PHONE_PER_DAY=5
MAX_OTP_PER_IP_PER_HOUR=10
```

---

## 🚀 PASO 3: Configurar WhatsApp Sandbox (Desarrollo)

### 3.1 Activar Sandbox

1. En el menú lateral: **"Messaging"** → **"Try it out"** → **"Send a WhatsApp message"**
2. Verás el **WhatsApp Sandbox**

### 3.2 Conectar tu WhatsApp Personal

Twilio te mostrará instrucciones:

**Pantalla de Sandbox:**
```
To connect your WhatsApp to this sandbox:

1. Save this number to your contacts: +1 415 523 8886
2. Send this message to that number on WhatsApp:
   join <your-sandbox-code>

Example: join chair-dozen
```

**Pasos:**
1. Abre WhatsApp en tu teléfono
2. Agrega el número de Twilio a tus contactos: `+1 415 523 8886`
3. Envía el mensaje: `join chair-dozen` (o el código que te muestre)
4. Recibirás confirmación de Twilio

**Tu WhatsApp ya está conectado al Sandbox** ✅

### 3.3 Agregar Números de Prueba

Para agregar más números (compañeros de equipo, testers):

1. Cada persona debe hacer el mismo proceso del 3.2
2. Guardar `+1 415 523 8886` en contactos
3. Enviar `join <tu-sandbox-code>`

**Límite:** Ilimitados números en Sandbox ✅

---

## 🚀 PASO 4: Probar Envío de Mensajes

### 4.1 Test desde la Consola de Twilio

1. En la página del Sandbox, verás **"Test WhatsApp"**
2. Ingresa tu número: `+52XXXXXXXXXX`
3. Escribe mensaje: `Hola desde Al Chile FB`
4. Clic en **"Send test message"**
5. Deberías recibir el mensaje en WhatsApp ✅

### 4.2 Test con cURL

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/ACxxxx/Messages.json \
  --data-urlencode "From=whatsapp:+14155238886" \
  --data-urlencode "To=whatsapp:+52XXXXXXXXXX" \
  --data-urlencode "Body=Prueba desde cURL - Al Chile FB" \
  -u ACxxxx:your_auth_token
```

Reemplaza:
- `ACxxxx`: Tu Account SID
- `your_auth_token`: Tu Auth Token
- `+52XXXXXXXXXX`: Número destino (que hizo join al sandbox)

### 4.3 Test con Node.js

Instalar SDK de Twilio:

```bash
cd backend
npm install twilio
```

Crear `backend/test-twilio-whatsapp.js`:

```javascript
const twilio = require('twilio');
require('dotenv').config();

async function testTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);

  try {
    const message = await client.messages.create({
      from: 'whatsapp:+14155238886', // Sandbox number
      to: 'whatsapp:+52XXXXXXXXXX',   // REEMPLAZA con tu número
      body: '✅ Twilio WhatsApp API funciona!'
    });

    console.log('✅ Mensaje enviado:', message.sid);
    console.log('   Estado:', message.status);
    console.log('   Precio:', message.price, message.priceUnit);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Código:', error.code);
    console.error('   Detalles:', error.moreInfo);
  }
}

testTwilio();
```

Ejecutar:
```bash
node test-twilio-whatsapp.js
```

**Salida esperada:**
```
✅ Mensaje enviado: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Estado: queued
   Precio: null null
```

---

## 🚀 PASO 5: Configurar SMS Fallback (Opcional)

Si WhatsApp falla, puedes enviar SMS como respaldo.

### 5.1 Obtener Número de Teléfono Twilio

1. En consola: **"Phone Numbers"** → **"Manage"** → **"Buy a number"**
2. Filtra por:
   - Country: **Mexico**
   - Capabilities: ✅ **SMS**
3. Busca números disponibles
4. Clic en **"Buy"** (cuesta ~$1 USD/mes)

### 5.2 Configurar Número

Guarda en `.env`:

```bash
TWILIO_PHONE_NUMBER=+521234567890  # Tu número Twilio comprado
```

### 5.3 Test de SMS

```javascript
// backend/test-twilio-sms.js
const twilio = require('twilio');
require('dotenv').config();

async function testSMS() {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER, // Tu número Twilio
      to: '+52XXXXXXXXXX',                   // REEMPLAZA
      body: '✅ Tu código de verificación es: 123456 - Al Chile FB'
    });

    console.log('✅ SMS enviado:', message.sid);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSMS();
```

---

## 🚀 PASO 6: Producción - Aprobar Número Propio

⚠️ **NOTA:** El Sandbox es solo para desarrollo. Para producción necesitas:

### 6.1 Solicitar Número WhatsApp Propio

1. Consola Twilio → **"Messaging"** → **"WhatsApp senders"**
2. Clic en **"Request to enable your Twilio number for WhatsApp"**
3. Selecciona el número Twilio que compraste
4. Completa formulario:
   - Business name: `Al Chile FB`
   - Website: `https://alchile.app`
   - Use case: `Two-factor authentication and order notifications`
   - Monthly volume: `1,000 - 10,000 messages`

5. **Submit for approval**

### 6.2 Verificación de Facebook Business

Twilio te pedirá:
- Cuenta de Facebook Business Manager
- Verificar identidad del negocio
- Documentos legales

**Tiempo de aprobación:** 1-2 semanas

### 6.3 Actualizar Variables

Una vez aprobado:

```bash
TWILIO_WHATSAPP_NUMBER=whatsapp:+52XXXXXXXXXX  # Tu número aprobado
```

---

## 📋 Comparativa: Sandbox vs Producción

| Aspecto | Sandbox (Desarrollo) | Producción (Aprobado) |
|---------|---------------------|----------------------|
| **Costo** | Gratis | $0.0055 USD/mensaje |
| **Número** | +1 415 523 8886 (compartido) | Tu número exclusivo |
| **Destinatarios** | Ilimitados (si hacen join) | Cualquiera sin join |
| **Branding** | "Twilio Sandbox" en mensaje | Tu marca |
| **Límites** | Sin límite | Sin límite |
| **Aprobación** | Inmediata | 1-2 semanas |
| **Producción** | ❌ No | ✅ Sí |

---

## 📋 Pros y Contras de Twilio

### ✅ Ventajas
- Setup súper rápido (30 min)
- Documentación excelente
- SDK oficial Node.js robusto
- Sandbox ilimitado para desarrollo
- Soporte 24/7
- Dashboard intuitivo
- SMS fallback incluido
- No requiere Meta Business Manager
- Aprobación más rápida que Meta

### ❌ Desventajas
- Precio más alto (~$0.0055 vs $0.003 Meta)
- Requiere comprar número Twilio ($1 USD/mes)
- Cuenta paga: $20 USD/mes
- Sandbox muestra "Twilio Sandbox" en mensajes

---

## 🧪 Ejemplo Completo de Código

### Módulo Twilio Client

Crea `backend/whatsapp/twilio-client.js`:

```javascript
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

  /**
   * Enviar mensaje por WhatsApp
   * @param {string} to - Número destino en formato E.164: +52XXXXXXXXXX
   * @param {string} body - Texto del mensaje
   * @returns {Promise<object>} Respuesta de Twilio
   */
  async sendWhatsApp(to, body) {
    try {
      const message = await this.client.messages.create({
        from: this.whatsappNumber,
        to: `whatsapp:${to}`,
        body: body
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status
      };

    } catch (error) {
      console.error('Twilio WhatsApp error:', error);
      throw new Error(`Failed to send WhatsApp: ${error.message}`);
    }
  }

  /**
   * Enviar SMS como fallback
   * @param {string} to - Número destino en formato E.164
   * @param {string} body - Texto del mensaje
   * @returns {Promise<object>}
   */
  async sendSMS(to, body) {
    if (!this.smsNumber) {
      throw new Error('SMS number not configured');
    }

    try {
      const message = await this.client.messages.create({
        from: this.smsNumber,
        to: to,
        body: body
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status
      };

    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Enviar OTP con fallback automático a SMS
   * @param {string} to - Número destino
   * @param {string} code - Código OTP
   * @returns {Promise<object>}
   */
  async sendOTP(to, code) {
    const message = `Al Chile FB\nTu código de verificación es: ${code}\nVálido por 10 minutos.`;

    try {
      // Intentar WhatsApp primero
      return await this.sendWhatsApp(to, message);

    } catch (whatsappError) {
      console.log('WhatsApp falló, intentando SMS...');

      try {
        // Fallback a SMS
        return await this.sendSMS(to, message);

      } catch (smsError) {
        throw new Error('Failed to send via WhatsApp and SMS');
      }
    }
  }
}

module.exports = TwilioWhatsAppClient;
```

### Uso del Cliente

```javascript
// backend/routes/auth.js
const TwilioClient = require('../whatsapp/twilio-client');

const twilioClient = new TwilioClient();

app.post('/api/auth/send-verification-code', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const { phoneNumber } = req.body;

  try {
    // Generar código OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Enviar por WhatsApp (con fallback a SMS)
    const result = await twilioClient.sendOTP(phoneNumber, code);

    // Guardar código en Firestore...
    // (código de OTP service)

    res.status(200).json({
      message: 'Verification code sent',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});
```

---

## 🔧 Troubleshooting

### Error: `Unable to create record: The 'To' number is not a valid phone number`

**Causa:** Formato de número incorrecto

**Solución:**
- Formato WhatsApp: `whatsapp:+52XXXXXXXXXX`
- Formato SMS: `+52XXXXXXXXXX`
- Sin espacios, sin guiones

---

### Error: `Account not authorized to send to this number`

**Causa:** En cuenta trial, solo puedes enviar a números verificados

**Solución:**
1. Ve a: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Agrega y verifica el número destino
3. O actualiza a cuenta de pago

---

### Error: `The destination does not have an active WhatsApp account`

**Causa:** El número destino no tiene WhatsApp

**Solución:**
- Verificar que el número tenga WhatsApp activo
- Usar SMS fallback

---

### Error: `This person hasn't joined your Twilio Sandbox yet`

**Causa:** En Sandbox, el destinatario debe hacer join primero

**Solución:**
1. Destinatario debe enviar `join <code>` a `+1 415 523 8886`
2. O aprobar tu número para producción (Paso 6)

---

## ✅ Checklist de Configuración

- [ ] Cuenta Twilio creada
- [ ] Identidad verificada (teléfono)
- [ ] Credenciales obtenidas (SID + Auth Token)
- [ ] WhatsApp Sandbox activado
- [ ] Tu WhatsApp conectado al Sandbox (join)
- [ ] Variables en `.env` configuradas
- [ ] SDK de Twilio instalado (`npm install twilio`)
- [ ] Test exitoso con Node.js
- [ ] (Opcional) Número SMS comprado
- [ ] (Producción) Número WhatsApp propio aprobado

---

## 📚 Recursos Adicionales

- **Documentación Twilio WhatsApp**: https://www.twilio.com/docs/whatsapp
- **API Reference**: https://www.twilio.com/docs/whatsapp/api
- **SDK Node.js**: https://www.twilio.com/docs/libraries/node
- **Error codes**: https://www.twilio.com/docs/api/errors
- **Pricing**: https://www.twilio.com/whatsapp/pricing
- **Console**: https://console.twilio.com/
- **Support**: https://support.twilio.com/

---

## 💡 Comparativa Final: Meta vs Twilio

| Aspecto | Meta WhatsApp | Twilio WhatsApp |
|---------|--------------|----------------|
| **Setup** | 2-3 horas | 30 min |
| **Dificultad** | Media-Alta | Baja |
| **Costo/mensaje** | $0.003 USD | $0.0055 USD |
| **Sandbox** | 5 destinatarios | Ilimitado |
| **Aprobación** | 1-2 semanas | 1 semana |
| **Documentación** | Extensa pero compleja | Excelente |
| **SDK oficial** | Axios manual | Twilio SDK |
| **SMS fallback** | No | Sí |
| **Soporte** | Meta support | 24/7 support |
| **Recomendado para** | Escala grande (>10k/mes) | MVP y desarrollo |

**Mi recomendación:**
- **Desarrollo/MVP**: Twilio (más rápido, más fácil)
- **Producción/Escala**: Meta (más barato a largo plazo)

---

**Siguiente:** Implementación del backend en `02-backend-implementation.md`
