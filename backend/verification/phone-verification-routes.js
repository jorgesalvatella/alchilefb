const express = require('express');
const admin = require('firebase-admin');
const authMiddleware = require('../authMiddleware');
const {
  createVerificationCode,
  verifyCode,
  getActiveCode
} = require('./code-service');
const { sendMulticast } = require('../fcm/fcm-service');
const { buildPhoneVerificationNotification } = require('../fcm/notification-builder');

const router = express.Router();
const db = admin.firestore();

/**
 * @swagger
 * /api/verification/generate-code:
 *   post:
 *     summary: Genera un código de verificación para el teléfono del usuario
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Código generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 code:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       '400':
 *         description: Usuario no tiene número de teléfono registrado
 *       '401':
 *         description: No autorizado
 */
router.post('/generate-code', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Obtener datos del usuario
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();

    // Verificar que el usuario tenga un número de teléfono registrado
    if (!userData.phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'no_phone_number',
        message: 'Debes registrar un número de teléfono antes de verificarlo'
      });
    }

    // Generar código de verificación
    const { code, expiresAt } = await createVerificationCode(
      userId,
      userData.phoneNumber
    );

    // ============================================================================
    // ESTRATEGIA: Detectar tokens móviles y decidir método de envío
    // ============================================================================

    // Buscar tokens FCM SOLO de dispositivos móviles (android, ios)
    const mobileTokensSnapshot = await db.collection('deviceTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .where('platform', 'in', ['android', 'ios'])
      .get();

    let strategy = 'display'; // Default: mostrar en pantalla
    let message = 'Ingresa el código que ves abajo';

    // Si tiene tokens móviles, enviar notificación FCM
    if (!mobileTokensSnapshot.empty) {
      strategy = 'fcm_mobile';

      // Extraer tokens
      const tokens = mobileTokensSnapshot.docs.map(doc => doc.data().token);

      console.log(`[Phone Verification] Enviando código a ${tokens.length} dispositivo(s) móvil(es) del usuario ${userId}`);

      // Construir notificación
      const { notification, data } = buildPhoneVerificationNotification(code);

      // Enviar notificación a todos los dispositivos móviles
      try {
        await sendMulticast({
          tokens,
          notification,
          data
        });

        message = 'Código enviado a tu dispositivo móvil';
        console.log('[Phone Verification] Notificación FCM enviada exitosamente');
      } catch (fcmError) {
        console.error('[Phone Verification] Error enviando notificación FCM:', fcmError);
        // Si falla FCM, hacer fallback a mostrar en pantalla
        strategy = 'display';
        message = 'No se pudo enviar notificación. Usa el código de abajo';
      }
    } else {
      console.log(`[Phone Verification] Usuario ${userId} no tiene dispositivos móviles registrados. Mostrando código en pantalla.`);
    }

    // Retornar response según estrategia
    res.status(200).json({
      success: true,
      strategy, // 'fcm_mobile' o 'display'
      code: strategy === 'display' ? code : undefined, // Solo enviar código si es display
      expiresAt: expiresAt.toISOString(),
      message
    });

  } catch (error) {
    console.error('Error generando código de verificación:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/verification/verify-code:
 *   post:
 *     summary: Verifica el código ingresado por el usuario
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código de 6 dígitos ingresado por el usuario
 *     responses:
 *       '200':
 *         description: Código verificado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Código inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 *                 attemptsRemaining:
 *                   type: number
 *       '401':
 *         description: No autorizado
 */
router.post('/verify-code', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { code } = req.body;

    // Validar que se envió el código
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'missing_code',
        message: 'Debes proporcionar un código de verificación'
      });
    }

    // Validar formato del código (6 dígitos)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_format',
        message: 'El código debe tener 6 dígitos'
      });
    }

    // Verificar el código usando el servicio
    const verificationResult = await verifyCode(userId, code);

    // Si la verificación fue exitosa, actualizar el usuario
    if (verificationResult.success) {
      await db.collection('users').doc(userId).update({
        phoneVerified: true,
        phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return res.status(200).json({
        success: true,
        message: 'Teléfono verificado exitosamente'
      });
    }

    // Si la verificación falló, retornar el error
    return res.status(400).json(verificationResult);

  } catch (error) {
    console.error('Error verificando código:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/verification/check-rate-limit:
 *   post:
 *     summary: Verifica si el usuario puede generar un nuevo código (rate limiting)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Rate limit status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed:
 *                   type: boolean
 *                 remaining:
 *                   type: number
 *                 message:
 *                   type: string
 *       '401':
 *         description: No autorizado
 */
router.post('/check-rate-limit', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Obtener o crear documento de rate limiting
    const attemptDocRef = db.collection('phoneVerificationAttempts').doc(userId);
    const attemptDoc = await attemptDocRef.get();

    const now = new Date();
    const resetTime = 6 * 60 * 60 * 1000; // 6 horas en milisegundos
    const maxAttempts = 3;

    if (!attemptDoc.exists) {
      // Primera vez - crear documento
      await attemptDocRef.set({
        attempts: 0,
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        resetAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + resetTime)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        allowed: true,
        remaining: maxAttempts,
        message: 'Puedes generar un código'
      });
    }

    const data = attemptDoc.data();
    const resetAt = data.resetAt.toDate();

    // Si ya pasaron 6 horas, resetear contador
    if (now > resetAt) {
      await attemptDocRef.update({
        attempts: 0,
        resetAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + resetTime)),
        lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        allowed: true,
        remaining: maxAttempts,
        message: 'Contador reseteado. Puedes generar un código'
      });
    }

    // Verificar si ha excedido el límite
    if (data.attempts >= maxAttempts) {
      const minutesLeft = Math.ceil((resetAt - now) / (60 * 1000));
      const hoursLeft = Math.floor(minutesLeft / 60);
      const minsLeft = minutesLeft % 60;

      let timeMessage = '';
      if (hoursLeft > 0) {
        timeMessage = `${hoursLeft}h ${minsLeft}m`;
      } else {
        timeMessage = `${minsLeft} minutos`;
      }

      return res.status(429).json({
        allowed: false,
        remaining: 0,
        message: `Demasiados intentos. Intenta de nuevo en ${timeMessage}`
      });
    }

    // Incrementar contador de intentos
    await attemptDocRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
      lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      allowed: true,
      remaining: maxAttempts - (data.attempts + 1),
      message: 'Puedes generar un código'
    });

  } catch (error) {
    console.error('Error checking rate limit:', error);
    res.status(500).json({
      allowed: false,
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/verification/mark-verified:
 *   post:
 *     summary: Marca el teléfono del usuario como verificado (después de Firebase Phone Auth)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Teléfono marcado como verificado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '401':
 *         description: No autorizado
 */
router.post('/mark-verified', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Actualizar usuario en Firestore
    await db.collection('users').doc(userId).update({
      phoneVerified: true,
      phoneVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      requiresReVerification: false, // Limpiar flag si existía
    });

    console.log(`[Phone Verification] Usuario ${userId} marcado como verificado`);

    return res.status(200).json({
      success: true,
      message: 'Teléfono verificado exitosamente'
    });

  } catch (error) {
    console.error('Error marking as verified:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Error interno del servidor'
    });
  }
});

/**
 * @swagger
 * /api/verification/send-fcm-notification:
 *   post:
 *     summary: Envía notificación FCM con el código de verificación (complemento a SMS)
 *     tags: [Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Notificación enviada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '401':
 *         description: No autorizado
 */
router.post('/send-fcm-notification', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Buscar tokens FCM SOLO de dispositivos móviles (android, ios)
    const mobileTokensSnapshot = await db.collection('deviceTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .where('platform', 'in', ['android', 'ios'])
      .get();

    if (mobileTokensSnapshot.empty) {
      console.log(`[FCM Notification] Usuario ${userId} no tiene dispositivos móviles registrados`);
      return res.status(200).json({
        success: true,
        message: 'Usuario no tiene dispositivos móviles'
      });
    }

    // Extraer tokens
    const tokens = mobileTokensSnapshot.docs.map(doc => doc.data().token);

    console.log(`[FCM Notification] Enviando notificación a ${tokens.length} dispositivo(s) móvil(es) del usuario ${userId}`);

    // Construir notificación genérica (el código real está en el SMS)
    const notification = {
      title: '📱 Código de Verificación',
      body: 'Revisa tu SMS para el código de verificación de tu teléfono'
    };

    const data = {
      type: 'phone_verification',
      timestamp: Date.now().toString(),
    };

    // Enviar notificación
    try {
      await sendMulticast({
        tokens,
        notification,
        data
      });

      console.log('[FCM Notification] Notificación enviada exitosamente');

      return res.status(200).json({
        success: true,
        message: 'Notificación FCM enviada'
      });

    } catch (fcmError) {
      console.error('[FCM Notification] Error enviando:', fcmError);
      return res.status(500).json({
        success: false,
        error: 'fcm_error',
        message: 'Error enviando notificación FCM'
      });
    }

  } catch (error) {
    console.error('Error sending FCM notification:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
