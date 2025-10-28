/**
 * @file fcm.js
 * @description API Routes para Firebase Cloud Messaging
 * @module routes/fcm
 *
 * Endpoints:
 * - POST /api/fcm/register-token - Registrar token FCM
 * - DELETE /api/fcm/unregister-token - Eliminar token FCM
 * - GET /api/fcm/stats - Obtener estadísticas de notificaciones
 *
 * Agente: Nexus (Backend)
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../authMiddleware');
const tokenManager = require('../fcm/token-manager');
const statsTracker = require('../fcm/stats-tracker');

/**
 * POST /api/fcm/register-token
 * Registra un nuevo token FCM para el usuario autenticado
 *
 * Body:
 * - token: string (requerido) - Token FCM del dispositivo
 * - platform: string (requerido) - 'web', 'android', o 'ios'
 * - deviceInfo: object (opcional) - Información del dispositivo
 *
 * Requiere autenticación.
 */
router.post('/register-token', authMiddleware, async (req, res) => {
  try {
    const { token, platform, deviceInfo } = req.body;

    // Validación básica
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'token is required',
      });
    }

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'platform is required',
      });
    }

    // Registrar token
    const result = await tokenManager.registerToken({
      userId: req.user.uid,
      token,
      platform,
      deviceInfo: deviceInfo || {},
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      tokenId: result.tokenId,
      action: result.action,
      message: 'Token registered successfully',
    });
  } catch (error) {
    console.error('Error in /register-token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/fcm/unregister-token
 * Elimina un token FCM del usuario autenticado
 *
 * Body:
 * - tokenId: string (requerido) - ID del documento del token en Firestore
 *
 * Requiere autenticación.
 */
router.delete('/unregister-token', authMiddleware, async (req, res) => {
  try {
    const { tokenId } = req.body;

    // Validación
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'tokenId is required',
      });
    }

    // Eliminar token (solo si pertenece al usuario)
    const result = await tokenManager.deleteToken(tokenId, req.user.uid);

    if (!result.success) {
      // Determinar código de error apropiado
      const statusCode = result.error.includes('not found') ? 404 : 400;

      return res.status(statusCode).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token unregistered successfully',
    });
  } catch (error) {
    console.error('Error in /unregister-token:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/fcm/stats
 * Obtiene estadísticas de notificaciones
 *
 * Query params:
 * - scope: string (opcional) - 'global' para estadísticas globales (solo admins)
 *
 * Por defecto, retorna las estadísticas del usuario autenticado.
 * Para obtener estadísticas globales, pasar ?scope=global (requiere permisos de admin).
 *
 * Requiere autenticación.
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { scope } = req.query;

    // Si solicita stats globales, verificar permisos de admin
    if (scope === 'global') {
      const isAdmin = req.user.super_admin || req.user.admin;

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required to view global stats',
        });
      }

      // Obtener estadísticas globales
      const result = await statsTracker.getGlobalStats();

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        stats: result.stats,
        scope: 'global',
      });
    }

    // Obtener estadísticas del usuario
    const result = await statsTracker.getStatsForUser(req.user.uid);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      stats: result.stats,
      scope: 'user',
    });
  } catch (error) {
    console.error('Error in /stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
