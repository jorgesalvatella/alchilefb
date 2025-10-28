/**
 * @file stats-tracker.js
 * @description Tracker de estadísticas para notificaciones FCM
 * @module fcm/stats-tracker
 *
 * Responsable de:
 * - Actualizar contadores de notificaciones (enviadas, entregadas, clicadas, fallidas)
 * - Mantener estadísticas por usuario
 * - Mantener estadísticas globales
 * - Estadísticas por plataforma y tipo de notificación
 *
 * Agente: Nexus (Backend)
 * Decisiones implementadas:
 * - Opción D: Fire-and-forget (no esperar confirmación, no bloquear flujo)
 */

const admin = require('firebase-admin');

/**
 * Incrementa el contador de notificaciones enviadas
 * Fire-and-forget: No espera confirmación (Decisión 3-D)
 * @param {string} userId - UID del usuario
 * @param {string} platform - Plataforma ('web', 'android', 'ios')
 * @param {string} notificationType - Tipo de notificación ('order_status', 'promotion', etc.)
 * @returns {Promise<void>}
 */
async function incrementSent(userId, platform, notificationType) {
  try {
    const db = admin.firestore();
    const statsRef = db.collection('notificationStats').doc(userId);

    await statsRef.update({
      totalSent: admin.firestore.FieldValue.increment(1),
      [`byPlatform.${platform}.sent`]: admin.firestore.FieldValue.increment(1),
      [`byType.${notificationType}.sent`]: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // También actualizar stats globales
    incrementGlobalStats(platform, notificationType, 'sent').catch((err) => {
      console.error('Error updating global stats:', err);
    });
  } catch (error) {
    // Fire-and-forget: Solo loguear error, no throw
    console.error('Error incrementing sent stats:', error);
  }
}

/**
 * Incrementa el contador de notificaciones entregadas
 * @param {string} userId - UID del usuario
 * @param {string} platform - Plataforma
 * @param {string} notificationType - Tipo de notificación
 * @returns {Promise<void>}
 */
async function incrementDelivered(userId, platform, notificationType) {
  try {
    const db = admin.firestore();
    const statsRef = db.collection('notificationStats').doc(userId);

    await statsRef.update({
      totalDelivered: admin.firestore.FieldValue.increment(1),
      [`byPlatform.${platform}.delivered`]: admin.firestore.FieldValue.increment(1),
      [`byType.${notificationType}.delivered`]: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // También actualizar stats globales
    incrementGlobalStats(platform, notificationType, 'delivered').catch((err) => {
      console.error('Error updating global stats:', err);
    });
  } catch (error) {
    console.error('Error incrementing delivered stats:', error);
  }
}

/**
 * Incrementa el contador de notificaciones clicadas
 * @param {string} userId - UID del usuario
 * @param {string} platform - Plataforma
 * @param {string} notificationType - Tipo de notificación
 * @returns {Promise<void>}
 */
async function incrementClicked(userId, platform, notificationType) {
  try {
    const db = admin.firestore();
    const statsRef = db.collection('notificationStats').doc(userId);

    await statsRef.update({
      totalClicked: admin.firestore.FieldValue.increment(1),
      [`byPlatform.${platform}.clicked`]: admin.firestore.FieldValue.increment(1),
      [`byType.${notificationType}.clicked`]: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // También actualizar stats globales
    incrementGlobalStats(platform, notificationType, 'clicked').catch((err) => {
      console.error('Error updating global stats:', err);
    });
  } catch (error) {
    console.error('Error incrementing clicked stats:', error);
  }
}

/**
 * Incrementa el contador de notificaciones fallidas
 * @param {string} userId - UID del usuario
 * @param {string} platform - Plataforma
 * @param {string} notificationType - Tipo de notificación
 * @returns {Promise<void>}
 */
async function incrementFailed(userId, platform, notificationType) {
  try {
    const db = admin.firestore();
    const statsRef = db.collection('notificationStats').doc(userId);

    await statsRef.update({
      totalFailed: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // También actualizar stats globales
    incrementGlobalStats(platform, notificationType, 'failed').catch((err) => {
      console.error('Error updating global stats:', err);
    });
  } catch (error) {
    console.error('Error incrementing failed stats:', error);
  }
}

/**
 * Incrementa las estadísticas globales
 * @param {string} platform - Plataforma
 * @param {string} notificationType - Tipo de notificación
 * @param {string} metric - Métrica a incrementar ('sent', 'delivered', 'clicked', 'failed')
 * @returns {Promise<void>}
 */
async function incrementGlobalStats(platform, notificationType, metric) {
  try {
    const db = admin.firestore();
    const globalStatsRef = db.collection('notificationStats').doc('global');

    const updateData = {
      [`total${capitalize(metric)}`]: admin.firestore.FieldValue.increment(1),
      [`byPlatform.${platform}.${metric}`]: admin.firestore.FieldValue.increment(1),
      [`byType.${notificationType}.${metric}`]: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    await globalStatsRef.update(updateData);
  } catch (error) {
    console.error('Error incrementing global stats:', error);
  }
}

/**
 * Obtiene las estadísticas de un usuario
 * @param {string} userId - UID del usuario
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
async function getStatsForUser(userId) {
  try {
    const db = admin.firestore();
    const statsRef = db.collection('notificationStats').doc(userId);
    const doc = await statsRef.get();

    if (!doc.exists) {
      return {
        success: true,
        stats: null,
      };
    }

    return {
      success: true,
      stats: doc.data(),
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Obtiene las estadísticas globales
 * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
 */
async function getGlobalStats() {
  try {
    const db = admin.firestore();
    const globalStatsRef = db.collection('notificationStats').doc('global');
    const doc = await globalStatsRef.get();

    if (!doc.exists) {
      return {
        success: true,
        stats: null,
      };
    }

    return {
      success: true,
      stats: doc.data(),
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ========== HELPERS ==========

/**
 * Capitaliza la primera letra de una string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  incrementSent,
  incrementDelivered,
  incrementClicked,
  incrementFailed,
  incrementGlobalStats,
  getStatsForUser,
  getGlobalStats,
};
