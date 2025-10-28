/**
 * @file fcm-service.js
 * @description Servicio para envío de notificaciones FCM (Firebase Cloud Messaging)
 * @module fcm/fcm-service
 *
 * Responsable de:
 * - Enviar notificaciones a dispositivos individuales
 * - Enviar notificaciones multicast (múltiples dispositivos)
 * - Enviar notificaciones a topics
 * - Manejar errores de tokens inválidos
 * - Batching automático para envíos grandes
 *
 * Agente: Nexus (Backend)
 * Decisiones implementadas:
 * - Opción D: Fire-and-forget para stats (se implementará en stats-tracker)
 * - Batch size: 500 tokens (límite de FCM)
 */

const admin = require('firebase-admin');
const tokenManager = require('./token-manager');

// Configuración
const CONFIG = {
  BATCH_SIZE: parseInt(process.env.FCM_BATCH_SIZE) || 500, // Límite de FCM
};

/**
 * Envía una notificación a un dispositivo específico
 * @param {string} token - Token FCM del dispositivo
 * @param {Object} notification - Contenido de la notificación
 * @param {string} notification.title - Título de la notificación
 * @param {string} notification.body - Cuerpo de la notificación
 * @param {Object} [data] - Data payload adicional
 * @param {string} [tokenId] - ID del documento en Firestore (para marcar inválido)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendToDevice(token, notification, data = null, tokenId = null) {
  try {
    // Validación mínima
    if (!token) {
      return { success: false, error: 'token is required' };
    }

    if (!notification || !notification.title || !notification.body) {
      return { success: false, error: 'notification.title and notification.body are required' };
    }

    const message = {
      token,
      notification,
    };

    // Agregar data payload si existe
    if (data) {
      message.data = data;
    }

    const messageId = await admin.messaging().send(message);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('Error sending FCM notification:', error);

    // Manejar errores específicos de FCM
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      // Si tenemos el tokenId, marcarlo como inválido
      if (tokenId) {
        await tokenManager.markTokenAsInvalid(tokenId);
        console.log(`Token ${tokenId} marked as invalid after FCM error`);
      }
    }

    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
}

/**
 * Envía una notificación a múltiples dispositivos
 * Automáticamente divide en batches si hay más de 500 tokens (límite de FCM)
 * @param {string[]} tokens - Array de tokens FCM
 * @param {Object} notification - Contenido de la notificación
 * @param {Object} [data] - Data payload adicional
 * @returns {Promise<{success: boolean, successCount: number, failureCount: number, failedTokens?: Array, error?: string}>}
 */
async function sendMulticast(tokens, notification, data = null) {
  try {
    // Validación
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'tokens array cannot be empty' };
    }

    if (!notification || !notification.title || !notification.body) {
      return { success: false, error: 'notification.title and notification.body are required' };
    }

    // Si hay más de BATCH_SIZE tokens, dividir en batches
    if (tokens.length > CONFIG.BATCH_SIZE) {
      return await sendMulticastInBatches(tokens, notification, data);
    }

    // Enviar en un solo batch
    const message = {
      tokens,
      notification,
    };

    if (data) {
      message.data = data;
    }

    const response = await admin.messaging().sendMulticast(message);

    // Analizar respuesta para identificar tokens fallidos
    const failedTokens = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push({
            token: tokens[idx],
            error: resp.error?.message,
            code: resp.error?.code,
          });
        }
      });
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
    };
  } catch (error) {
    console.error('Error sending multicast FCM notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Envía notificaciones multicast en batches (interno)
 * @param {string[]} tokens
 * @param {Object} notification
 * @param {Object} data
 * @returns {Promise<{success: boolean, successCount: number, failureCount: number}>}
 */
async function sendMulticastInBatches(tokens, notification, data) {
  const batches = [];
  for (let i = 0; i < tokens.length; i += CONFIG.BATCH_SIZE) {
    batches.push(tokens.slice(i, i + CONFIG.BATCH_SIZE));
  }

  console.log(`Sending multicast in ${batches.length} batches (${tokens.length} total tokens)`);

  let totalSuccessCount = 0;
  let totalFailureCount = 0;
  const allFailedTokens = [];

  for (const batch of batches) {
    const result = await sendMulticast(batch, notification, data);

    if (result.success) {
      totalSuccessCount += result.successCount;
      totalFailureCount += result.failureCount;

      if (result.failedTokens) {
        allFailedTokens.push(...result.failedTokens);
      }
    } else {
      // Si un batch falla completamente, contar todos como fallidos
      totalFailureCount += batch.length;
    }
  }

  return {
    success: true,
    successCount: totalSuccessCount,
    failureCount: totalFailureCount,
    failedTokens: allFailedTokens.length > 0 ? allFailedTokens : undefined,
  };
}

/**
 * Envía una notificación a un topic
 * @param {string} topic - Nombre del topic
 * @param {Object} notification - Contenido de la notificación
 * @param {Object} [data] - Data payload adicional
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendToTopic(topic, notification, data = null) {
  try {
    // Validación
    if (!topic) {
      return { success: false, error: 'topic is required' };
    }

    if (!notification || !notification.title || !notification.body) {
      return { success: false, error: 'notification.title and notification.body are required' };
    }

    const message = {
      topic,
      notification,
    };

    if (data) {
      message.data = data;
    }

    const messageId = await admin.messaging().send(message);

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('Error sending FCM topic notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Envía una notificación a todos los dispositivos activos de un usuario
 * @param {string} userId - UID del usuario
 * @param {Object} notification - Contenido de la notificación
 * @param {Object} [data] - Data payload adicional
 * @param {string} [platform] - Filtrar por plataforma (opcional)
 * @returns {Promise<{success: boolean, successCount?: number, failureCount?: number, error?: string}>}
 */
async function sendToUserDevices(userId, notification, data = null, platform = null) {
  try {
    // Obtener tokens activos del usuario
    const tokensResult = await tokenManager.getActiveTokensForUser(userId, platform);

    if (!tokensResult.success) {
      return {
        success: false,
        error: `Failed to get user tokens: ${tokensResult.error}`,
      };
    }

    if (tokensResult.tokens.length === 0) {
      return {
        success: false,
        error: 'No active tokens found for user',
      };
    }

    // Extraer tokens FCM
    const fcmTokens = tokensResult.tokens.map((t) => t.token);

    // Enviar multicast
    const result = await sendMulticast(fcmTokens, notification, data);

    return result;
  } catch (error) {
    console.error('Error sending to user devices:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  sendToDevice,
  sendMulticast,
  sendToTopic,
  sendToUserDevices,
  CONFIG, // Exportar para tests
};
