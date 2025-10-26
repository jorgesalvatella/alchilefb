# 📦 Backend Archivado - Al Chile FB

Esta carpeta contiene código backend que **NO está en uso actualmente**.

---

## 📂 Contenido

### `whatsapp/` - Módulo de WhatsApp/Twilio

**Estado**: ❌ Archivado
**Fecha**: 2025-10-26

**Archivos**:
- `whatsapp/providers/twilio-client.js` - Cliente de Twilio para WhatsApp
- `whatsapp/providers/meta-client.js` - Cliente de Meta WhatsApp Business API
- `whatsapp/providers/whatsapp-factory.js` - Factory pattern para providers
- `whatsapp/otp-service.js` - Generación y validación de OTP
- `whatsapp/rate-limiter.js` - Control de rate limiting

### `auth.js` - Rutas de autenticación WhatsApp

**Estado**: ❌ Archivado
**Fecha**: 2025-10-26

**Endpoints**:
- `POST /api/auth/send-verification-code` - Enviar código OTP
- `POST /api/auth/verify-code` - Verificar código OTP
- `POST /api/auth/resend-verification-code` - Reenviar código

---

## 🔄 Para Recuperar

Ver `docs/archived/README.md` para instrucciones completas.

---

**Última actualización**: 2025-10-26
