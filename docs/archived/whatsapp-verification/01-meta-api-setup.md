# Guía de Configuración: Meta WhatsApp Business API

## 📋 Información

**Agente responsable**: Aire (DevOps)
**Tiempo estimado**: 2-3 horas
**Dificultad**: Media-Alta
**Pre-requisitos**:
- Cuenta de Facebook personal
- Número de teléfono físico para WhatsApp Business (no puede estar registrado en WhatsApp personal)
- Tarjeta de crédito (para verificación, pero hay créditos gratuitos)

---

## 🎯 Objetivo

Configurar Meta WhatsApp Business API para poder enviar mensajes de verificación OTP a usuarios de la aplicación Al Chile FB.

---

## 💰 Costo Estimado

- **Desarrollo/Testing**: GRATIS (con número de prueba)
- **Producción**: ~$0.003 USD por mensaje (México)
- **Sin cuota mensual**: Solo pagas por mensajes enviados
- **1000 conversaciones gratis al mes** (promoción Meta)

---

## 📊 Resumen del Proceso

```
1. Crear cuenta Meta Business Suite
2. Crear App en Meta for Developers
3. Agregar WhatsApp Business a la App
4. Configurar número de teléfono
5. Obtener tokens de acceso
6. Probar envío de mensajes
7. (Opcional) Configurar webhook
8. (Producción) Solicitar aprobación
```

---

## 🚀 PASO 1: Crear Meta Business Suite

1. Ve a: https://business.facebook.com/
2. Clic en **"Crear cuenta"**
3. Ingresa:
   - Nombre del negocio: `Al Chile FB`
   - Tu nombre completo
   - Email del negocio
4. Verifica tu email

**Resultado:** Anota tu **Business Manager ID**

---

## 🚀 PASO 2: Crear App en Meta for Developers

1. Ve a: https://developers.facebook.com/
2. Clic en **"Mis aplicaciones" → "Crear aplicación"**
3. Tipo: **"Empresa"** (Business)
4. Información:
   - Nombre: `Al Chile FB WhatsApp`
   - Email: tu email
   - Cuenta empresarial: selecciona la del Paso 1
5. Completa CAPTCHA

**Resultado:** Anota tu **App ID** y **App Secret**

---

## 🚀 PASO 3: Agregar WhatsApp Business

1. En dashboard de app → **"Agregar productos"**
2. Busca **"WhatsApp"** → **"Configurar"**
3. Crea **WhatsApp Business Account**:
   - Nombre: `Al Chile FB`
   - Timezone: `America/Mexico_City`
   - Moneda: `MXN`

---

## 🚀 PASO 4: Configurar Número de Teléfono

### Opción A: Número de Prueba (RECOMENDADO para desarrollo)

1. Clic en **"Usar número de prueba"**
2. Meta te asigna un número automáticamente
3. Límites:
   - ✅ GRATIS ilimitado
   - ❌ Solo 5 destinatarios (debes pre-aprobarlos)
   - ❌ No para producción

### Opción B: Tu Propio Número (para producción)

1. Ingresa número: `+52 XXX XXX XXXX`
2. Método verificación: SMS o llamada
3. Ingresa código recibido

⚠️ **REQUISITOS:**
- NO estar en WhatsApp personal
- NO estar en WhatsApp Business app
- Recibir SMS/llamadas

**Resultado:** Anota tu **Phone Number ID**

---

## 🚀 PASO 5: Obtener Tokens de Acceso

### Token Temporal (desarrollo - 24 horas)

1. Panel WhatsApp → **"API Setup"**
2. **"Temporary access token"** → Copiar
3. Guardar en `.env`

### Token Permanente (producción - System User)

1. Meta Business Suite → **"Usuarios" → "Usuarios del sistema"**
2. **"Agregar"**:
   - Nombre: `whatsapp-api-user`
   - Rol: `Administrador`
3. **"Generar nuevo token"**:
   - App: `Al Chile FB WhatsApp`
   - Permisos:
     - ✅ `whatsapp_business_management`
     - ✅ `whatsapp_business_messaging`
   - Duración: `60 días` o `Sin expiración`
4. **COPIAR TOKEN INMEDIATAMENTE**

**Resultado:** Anota tu **Access Token**

---

## 🚀 PASO 6: Variables de Entorno

Crea/actualiza `backend/.env`:

```bash
# META WHATSAPP BUSINESS API
WHATSAPP_PROVIDER=meta
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# CONFIGURACIÓN OTP
OTP_EXPIRATION_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_SECONDS=60

# RATE LIMITING
MAX_OTP_PER_PHONE_PER_DAY=5
MAX_OTP_PER_IP_PER_HOUR=10
```

---

## 🧪 PASO 7: Probar Configuración

### Test con cURL

```bash
curl -X POST \
  https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "52XXXXXXXXXX",
    "type": "text",
    "text": {
      "body": "Prueba - Al Chile FB"
    }
  }'
```

**Respuesta esperada:**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [{"input": "52XXXXXXXXXX", "wa_id": "52XXXXXXXXXX"}],
  "messages": [{"id": "wamid.xxxxx"}]
}
```

### Test con Node.js

Crea `backend/test-meta-whatsapp.js`:

```javascript
const axios = require('axios');
require('dotenv').config();

async function testMeta() {
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const TO = '521234567890'; // REEMPLAZA con tu número

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: TO,
        type: 'text',
        text: { body: '✅ Meta WhatsApp API funciona!' }
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mensaje enviado:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMeta();
```

Ejecutar:
```bash
cd backend
node test-meta-whatsapp.js
```

---

## 📋 Pros y Contras de Meta API

### ✅ Ventajas
- Integración oficial de Meta/Facebook
- Precio más bajo a escala (~$0.003 USD/msg)
- 1000 conversaciones gratis/mes
- Sin cuota mensual
- Soporte oficial de Meta

### ❌ Desventajas
- Setup complejo (2-3 horas)
- Requiere verificación de negocio para producción
- Proceso de aprobación: 1-2 semanas
- Número de prueba limitado (5 destinatarios)
- Documentación extensa pero compleja

---

## ✅ Checklist

- [ ] Meta Business Suite creada
- [ ] App en Meta Developers creada
- [ ] WhatsApp Business agregado
- [ ] Número configurado (prueba o propio)
- [ ] Token de acceso obtenido
- [ ] Phone Number ID obtenido
- [ ] Variables en `.env` configuradas
- [ ] Test exitoso con cURL o Node.js
- [ ] (Producción) Negocio verificado

---

**Siguiente:** Ver `01-twilio-setup.md` para configuración alternativa con Twilio.
