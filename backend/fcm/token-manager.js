/**
 * @file token-manager.js
 * @description Gestor de tokens FCM (Firebase Cloud Messaging)
 * @module fcm/token-manager
 *
 * Responsable de:
 * - Registrar tokens FCM de dispositivos
 * - Actualizar tokens existentes
 * - Eliminar tokens (soft delete)
 * - Marcar tokens como inválidos (contador de fallos)
 * - Limpiar tokens expirados
 *
 * Agente: Nexus (Backend)
 * Decisiones implementadas:
 * - Opción A: Actualizar token existente si ya está registrado
 * - Opción D: Incrementar contador de fallos antes de eliminar (3 strikes)
 * - Opción D: Validación mínima + logging de anomalías
 */

const admin = require('firebase-admin');

// Configuración por defecto (puede ser sobrescrita por .env)
const CONFIG = {
  MAX_TOKENS_PER_USER: parseInt(process.env.FCM_MAX_TOKENS_PER_USER) || 10,
  TOKEN_CLEANUP_DAYS: parseInt(process.env.FCM_TOKEN_CLEANUP_DAYS) || 90,
  MAX_FAILURES_BEFORE_DEACTIVATION: 3,
};

/**
 * Registra un nuevo token FCM o actualiza uno existente
 * @param {Object} tokenData - Datos del token
 * @param {string} tokenData.userId - UID del usuario
 * @param {string} tokenData.token - Token FCM del dispositivo
 * @param {string} tokenData.platform - Plataforma ('web', 'android', 'ios')
 * @param {Object} tokenData.deviceInfo - Información del dispositivo
 * @returns {Promise<{success: boolean, tokenId?: string, action?: string, error?: string}>}
 */
async function registerToken(tokenData) {
  const db = admin.firestore();

  try {
    // Validación mínima (Decisión 4-D)
    const validation = validateTokenData(tokenData);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { userId, token, platform, deviceInfo } = tokenData;

    // Verificar si el token ya existe para este usuario
    const existingTokenQuery = await db
      .collection('deviceTokens')
      .where('userId', '==', userId)
      .where('token', '==', token)
      .limit(1)
      .get();

    // Si el token ya existe, actualizarlo (Decisión 1-A)
    if (!existingTokenQuery.empty) {
      const existingDoc = existingTokenQuery.docs[0];
      const tokenRef = db.collection('deviceTokens').doc(existingDoc.id);

      await tokenRef.set(
        {
          userId,
          token,
          platform,
          deviceInfo: deviceInfo || {},
          isActive: true,
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
          // Resetear contador de fallos si se re-registra
          failureCount: 0,
        },
        { merge: true }
      );

      return {
        success: true,
        tokenId: existingDoc.id,
        action: 'updated',
      };
    }

    // Verificar límite de tokens por usuario
    const userTokensQuery = await db
      .collection('deviceTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    if (userTokensQuery.size >= CONFIG.MAX_TOKENS_PER_USER) {
      return {
        success: false,
        error: `User has reached the maximum number of tokens (${CONFIG.MAX_TOKENS_PER_USER})`,
      };
    }

    // Crear nuevo token
    const newTokenRef = db.collection('deviceTokens').doc();
    await newTokenRef.set({
      userId,
      token,
      platform,
      deviceInfo: deviceInfo || {},
      isActive: true,
      failureCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Logging de anomalías (Decisión 4-D)
    logAnomalies(tokenData);

    return {
      success: true,
      tokenId: newTokenRef.id,
      action: 'created',
    };
  } catch (error) {
    console.error('Error registering token:', error);
    return {
      success: false,
      error: `Failed to register token: ${error.message}`,
    };
  }
}

/**
 * Elimina un token FCM (soft delete)
 * @param {string} tokenId - ID del documento del token
 * @param {string} userId - UID del usuario (para verificar permisos)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteToken(tokenId, userId) {
  const db = admin.firestore();

  try {
    const tokenRef = db.collection('deviceTokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return { success: false, error: 'Token not found' };
    }

    const tokenData = tokenDoc.data();

    // Verificar que el token pertenezca al usuario
    if (tokenData.userId !== userId) {
      return { success: false, error: 'Unauthorized: Token does not belong to user' };
    }

    // Soft delete
    await tokenRef.update({
      isActive: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting token:', error);
    return {
      success: false,
      error: `Failed to delete token: ${error.message}`,
    };
  }
}

/**
 * Marca un token como inválido e incrementa el contador de fallos
 * Después de 3 fallos, desactiva el token (Decisión 2-D)
 * @param {string} tokenId - ID del documento del token
 * @returns {Promise<{success: boolean, action?: string, error?: string}>}
 */
async function markTokenAsInvalid(tokenId) {
  const db = admin.firestore();

  try {
    const tokenRef = db.collection('deviceTokens').doc(tokenId);
    const tokenDoc = await tokenRef.get();

    if (!tokenDoc.exists) {
      return { success: false, error: 'Token not found' };
    }

    const tokenData = tokenDoc.data();
    const currentFailureCount = tokenData.failureCount || 0;
    const newFailureCount = currentFailureCount + 1;

    // Después de 3 fallos, desactivar el token (Decisión 2-D)
    if (newFailureCount >= CONFIG.MAX_FAILURES_BEFORE_DEACTIVATION) {
      await tokenRef.update({
        failureCount: newFailureCount,
        isActive: false,
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastFailure: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Token ${tokenId} deactivated after ${newFailureCount} failures`);

      return {
        success: true,
        action: 'deactivated',
        failureCount: newFailureCount,
      };
    }

    // Incrementar contador de fallos
    await tokenRef.update({
      failureCount: newFailureCount,
      lastFailure: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Token ${tokenId} marked as invalid (failure ${newFailureCount}/3)`);

    return {
      success: true,
      action: 'incremented',
      failureCount: newFailureCount,
    };
  } catch (error) {
    console.error('Error marking token as invalid:', error);
    return {
      success: false,
      error: `Failed to mark token as invalid: ${error.message}`,
    };
  }
}

/**
 * Obtiene todos los tokens activos de un usuario
 * @param {string} userId - UID del usuario
 * @param {string} [platform] - Filtrar por plataforma (opcional)
 * @returns {Promise<{success: boolean, tokens?: Array, error?: string}>}
 */
async function getActiveTokensForUser(userId, platform = null) {
  const db = admin.firestore();

  try {
    let query = db
      .collection('deviceTokens')
      .where('userId', '==', userId)
      .where('isActive', '==', true);

    // Filtrar por plataforma si se especifica
    if (platform) {
      query = query.where('platform', '==', platform);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return { success: true, tokens: [] };
    }

    const tokens = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, tokens };
  } catch (error) {
    console.error('Error getting active tokens:', error);
    return {
      success: false,
      error: `Failed to get active tokens: ${error.message}`,
    };
  }
}

/**
 * Limpia tokens que no han sido usados en X días (por defecto 90)
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
 */
async function cleanupExpiredTokens() {
  const db = admin.firestore();

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.TOKEN_CLEANUP_DAYS);

    const snapshot = await db.collection('deviceTokens').get();

    if (snapshot.empty) {
      return { success: true, deletedCount: 0 };
    }

    let deletedCount = 0;
    const deletePromises = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const lastUsed = data.lastUsed?.toDate();

      // Si lastUsed es anterior a la fecha de corte, eliminar
      if (lastUsed && lastUsed < cutoffDate) {
        deletePromises.push(doc.ref.delete());
        deletedCount++;
      }
    });

    await Promise.all(deletePromises);

    console.log(`Cleaned up ${deletedCount} expired tokens (older than ${CONFIG.TOKEN_CLEANUP_DAYS} days)`);

    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return {
      success: false,
      error: `Failed to cleanup expired tokens: ${error.message}`,
    };
  }
}

// ========== HELPERS ==========

/**
 * Valida los datos del token (Decisión 4-D: Validación mínima)
 * @param {Object} tokenData
 * @returns {{valid: boolean, error?: string}}
 */
function validateTokenData(tokenData) {
  // Validar campos requeridos
  if (!tokenData.userId) {
    return { valid: false, error: 'userId is required' };
  }

  if (!tokenData.token) {
    return { valid: false, error: 'token is required' };
  }

  if (!tokenData.platform) {
    return { valid: false, error: 'platform is required' };
  }

  // Validar enum de platform
  const validPlatforms = ['web', 'android', 'ios'];
  if (!validPlatforms.includes(tokenData.platform)) {
    return {
      valid: false,
      error: `platform must be one of: ${validPlatforms.join(', ')}`,
    };
  }

  // Validar longitud del token
  if (tokenData.token.length < 50 || tokenData.token.length > 500) {
    return {
      valid: false,
      error: 'token length must be between 50 and 500 characters',
    };
  }

  return { valid: true };
}

/**
 * Loguea anomalías en los datos (Decisión 4-D: Logging de anomalías)
 * @param {Object} tokenData
 */
function logAnomalies(tokenData) {
  const { deviceInfo } = tokenData;

  if (deviceInfo?.userAgent && deviceInfo.userAgent.length > 1000) {
    console.warn(`Anomaly: userAgent exceeds 1000 characters (${deviceInfo.userAgent.length})`);
  }

  if (deviceInfo?.deviceModel && deviceInfo.deviceModel.length > 200) {
    console.warn(`Anomaly: deviceModel exceeds 200 characters (${deviceInfo.deviceModel.length})`);
  }

  // Loguear campos extra no documentados
  const expectedFields = ['userId', 'token', 'platform', 'deviceInfo'];
  const extraFields = Object.keys(tokenData).filter(
    (key) => !expectedFields.includes(key)
  );

  if (extraFields.length > 0) {
    console.warn(`Anomaly: Extra fields detected: ${extraFields.join(', ')}`);
  }
}

module.exports = {
  registerToken,
  deleteToken,
  markTokenAsInvalid,
  getActiveTokensForUser,
  cleanupExpiredTokens,
  CONFIG, // Exportar para tests
};
