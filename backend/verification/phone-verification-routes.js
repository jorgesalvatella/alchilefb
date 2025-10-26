const express = require('express');
const admin = require('firebase-admin');
const authMiddleware = require('../authMiddleware');
const {
  createVerificationCode,
  verifyCode,
  getActiveCode
} = require('./code-service');

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

    // Retornar el código en la response para mostrarlo en la UI
    res.status(200).json({
      success: true,
      code,
      expiresAt: expiresAt.toISOString()
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

module.exports = router;
