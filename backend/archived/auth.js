/**
 * Rutas de Autenticación - Verificación de Teléfono
 * Endpoints para enviar y verificar códigos OTP por WhatsApp
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const WhatsAppFactory = require('../whatsapp/providers/whatsapp-factory');
const OTPService = require('../whatsapp/otp-service');
const RateLimiter = require('../whatsapp/rate-limiter');

// Inicializar servicios
const whatsappClient = WhatsAppFactory.createClient();
const otpService = new OTPService();
const rateLimiter = new RateLimiter();

/**
 * POST /api/auth/send-verification-code
 * Envía código OTP por WhatsApp
 *
 * Body:
 *   - phoneNumber: string (formato +52XXXXXXXXXX)
 *   - purpose: string (opcional, default: 'registration')
 *
 * Headers:
 *   - Authorization: Bearer <firebase-id-token>
 *
 * Response 200:
 *   {
 *     message: 'Código de verificación enviado',
 *     messageId: 'SMxxxx...',
 *     provider: 'twilio-whatsapp' | 'twilio-sms' | 'meta-whatsapp',
 *     expiresInMinutes: 10
 *   }
 *
 * Response 400: Bad request (formato de teléfono inválido)
 * Response 429: Rate limit excedido
 * Response 500: Error al enviar código
 */
router.post('/send-verification-code', authMiddleware, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { phoneNumber, purpose = 'registration' } = req.body;

    // Validar que phoneNumber esté presente
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber es requerido' });
    }

    // Validar formato E.164: +52XXXXXXXXXX
    if (!phoneNumber.match(/^\+52\d{10}$/)) {
      return res.status(400).json({
        error: 'Formato de teléfono inválido. Use: +52XXXXXXXXXX (10 dígitos después de +52)'
      });
    }

    // Obtener IP del cliente
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    // Verificar rate limiting
    const rateLimitCheck = await rateLimiter.canSendOTP(phoneNumber, ipAddress);

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: rateLimitCheck.reason,
        limitType: rateLimitCheck.limitType,
        limit: rateLimitCheck.limit
      });
    }

    // Invalidar códigos anteriores del usuario
    await otpService.invalidatePreviousCodes(userId);

    // Generar nuevo código OTP
    const { code } = await otpService.createVerificationCode(
      userId,
      phoneNumber,
      purpose,
      ipAddress
    );

    // Enviar código por WhatsApp
    const result = await whatsappClient.sendOTP(phoneNumber, code);

    console.log(
      `[Auth] OTP enviado exitosamente - ` +
      `userId: ${userId}, ` +
      `phoneNumber: ${phoneNumber}, ` +
      `provider: ${result.provider}, ` +
      `messageId: ${result.messageId}`
    );

    res.status(200).json({
      message: 'Código de verificación enviado',
      messageId: result.messageId,
      provider: result.provider,
      expiresInMinutes: process.env.OTP_EXPIRATION_MINUTES || 10
    });

  } catch (error) {
    console.error('[Auth] Error enviando código de verificación:', error);
    res.status(500).json({
      error: 'Error al enviar código de verificación',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/verify-code
 * Verifica el código OTP ingresado por el usuario
 *
 * Body:
 *   - code: string (6 dígitos)
 *
 * Headers:
 *   - Authorization: Bearer <firebase-id-token>
 *
 * Response 200:
 *   {
 *     message: 'Teléfono verificado exitosamente',
 *     verified: true
 *   }
 *
 * Response 400: Código inválido, expirado o demasiados intentos
 * Response 500: Error al verificar código
 */
router.post('/verify-code', authMiddleware, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { code } = req.body;

    // Validar que code esté presente
    if (!code) {
      return res.status(400).json({ error: 'code es requerido' });
    }

    // Validar formato del código (6 dígitos numéricos)
    if (!code.match(/^\d{6}$/)) {
      return res.status(400).json({
        error: 'Código debe ser de 6 dígitos numéricos'
      });
    }

    // Verificar código
    const verification = await otpService.verifyCode(userId, code);

    if (!verification.valid) {
      return res.status(400).json({ error: verification.error });
    }

    // Actualizar usuario en Firestore: marcar teléfono como verificado
    const admin = require('firebase-admin');
    await admin.firestore().collection('users').doc(userId).update({
      phoneVerified: true,
      phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[Auth] Teléfono verificado exitosamente - userId: ${userId}`);

    res.status(200).json({
      message: 'Teléfono verificado exitosamente',
      verified: true
    });

  } catch (error) {
    console.error('[Auth] Error verificando código:', error);
    res.status(500).json({
      error: 'Error al verificar código',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/resend-verification-code
 * Reenvía código OTP (respeta cooldown de 60 segundos)
 *
 * Body:
 *   - phoneNumber: string (formato +52XXXXXXXXXX)
 *
 * Headers:
 *   - Authorization: Bearer <firebase-id-token>
 *
 * Response 200:
 *   {
 *     message: 'Código reenviado',
 *     messageId: 'SMxxxx...',
 *     provider: 'twilio-whatsapp'
 *   }
 *
 * Response 400: Bad request
 * Response 429: Cooldown activo o rate limit excedido
 * Response 500: Error al reenviar código
 */
router.post('/resend-verification-code', authMiddleware, async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber es requerido' });
    }

    if (!phoneNumber.match(/^\+52\d{10}$/)) {
      return res.status(400).json({
        error: 'Formato de teléfono inválido. Use: +52XXXXXXXXXX'
      });
    }

    // Verificar cooldown (60 segundos entre reenvíos)
    const lastCode = await otpService.getLastCode(userId);

    if (lastCode) {
      const lastCreatedMs = lastCode.createdAt.toMillis();
      const cooldownMs = (parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60) * 1000;
      const timeSinceLastSend = Date.now() - lastCreatedMs;

      if (timeSinceLastSend < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        return res.status(429).json({
          error: `Espera ${remainingSeconds} segundos antes de solicitar otro código`,
          remainingSeconds: remainingSeconds
        });
      }
    }

    // Verificar rate limiting
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const rateLimitCheck = await rateLimiter.canSendOTP(phoneNumber, ipAddress);

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: rateLimitCheck.reason,
        limitType: rateLimitCheck.limitType
      });
    }

    // Invalidar códigos anteriores
    await otpService.invalidatePreviousCodes(userId);

    // Generar y enviar nuevo código
    const { code } = await otpService.createVerificationCode(
      userId,
      phoneNumber,
      'resend',
      ipAddress
    );

    const result = await whatsappClient.sendOTP(phoneNumber, code);

    console.log(`[Auth] Código reenviado - userId: ${userId}, provider: ${result.provider}`);

    res.status(200).json({
      message: 'Código reenviado',
      messageId: result.messageId,
      provider: result.provider
    });

  } catch (error) {
    console.error('[Auth] Error reenviando código:', error);
    res.status(500).json({
      error: 'Error al reenviar código',
      details: error.message
    });
  }
});

module.exports = router;
