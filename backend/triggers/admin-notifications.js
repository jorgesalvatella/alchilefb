/**
 * Admin Notifications Trigger - Al Chile FB
 *
 * Maneja todas las notificaciones para ADMINISTRADORES (super_admin + admin).
 *
 * Eventos soportados:
 * - admin.new_order: Nuevo pedido creado
 * - admin.order_cancelled: Pedido cancelado
 *
 * Eventos que quedan para FASE 5 (requieren cron jobs):
 * - admin.order_unassigned: Pedido sin repartidor >10 min
 * - admin.driver_inactive: Repartidor inactivo >30 min
 * - admin.low_stock: Stock bajo
 * - admin.high_traffic: Mucho tráfico
 */

const admin = require('firebase-admin');
const fcmService = require('../fcm/fcm-service');
const notificationBuilder = require('../fcm/notification-builder');
const statsTracker = require('../fcm/stats-tracker');
const tokenManager = require('../fcm/token-manager');

const db = admin.firestore();

/**
 * Handler principal para eventos de administradores
 *
 * @param {string} eventType - Tipo de evento (ej: 'admin.new_order')
 * @param {object} eventData - Datos del evento
 * @param {string} eventData.orderId - ID del pedido
 * @param {object} eventData.orderData - Datos completos del pedido (opcional)
 * @param {object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, notificationsSent?: number}>}
 */
async function handleEvent(eventType, eventData, options = {}) {
  try {
    console.log(`[AdminNotifications] Handling event: ${eventType}`, eventData);

    // Validación
    if (!eventData.orderId) {
      throw new Error('orderId is required');
    }

    // Obtener datos del pedido si no se proporcionaron
    let orderData = eventData.orderData;
    if (!orderData) {
      const orderDoc = await db.collection('pedidos').doc(eventData.orderId).get();
      if (!orderDoc.exists) {
        throw new Error(`Order not found: ${eventData.orderId}`);
      }
      orderData = orderDoc.data();
    }

    // Determinar el handler apropiado según el tipo de evento
    const [, action] = eventType.split('.');

    switch (action) {
      case 'new_order':
        return await handleNewOrder(eventData.orderId, orderData, options);

      case 'order_cancelled':
        return await handleOrderCancelled(eventData.orderId, orderData, options);

      default:
        throw new Error(`Unknown admin event action: ${action}`);
    }

  } catch (error) {
    if (options.skipErrorHandling) {
      throw error;
    }

    console.error(`[AdminNotifications] Error handling ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los UIDs de todos los usuarios con rol admin o super_admin
 *
 * @returns {Promise<{success: boolean, adminUserIds?: Array<string>}>}
 */
async function getAdminUserIds() {
  try {
    // Obtener usuarios de la colección 'users' con isAdmin: true o isSuperAdmin: true
    const usersSnapshot = await db.collection('users')
      .where('deleted', '==', false)
      .get();

    const adminUserIds = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // Verificar si es admin o super_admin
      if (userData.isAdmin || userData.isSuperAdmin) {
        adminUserIds.push(doc.id);
      }
    });

    console.log(`[AdminNotifications] Found ${adminUserIds.length} admin users`);

    return {
      success: true,
      adminUserIds
    };

  } catch (error) {
    console.error('[AdminNotifications] Error getting admin user IDs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Nuevo pedido creado
 */
async function handleNewOrder(orderId, orderData, options) {
  try {
    // Obtener todos los admins
    const adminsResult = await getAdminUserIds();
    if (!adminsResult.success || adminsResult.adminUserIds.length === 0) {
      console.log('[AdminNotifications] No admin users found');
      return { success: true, notificationsSent: 0 };
    }

    // Construir notificación
    const { notification, data } = notificationBuilder.buildAdminNotification('admin.new_order', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase(),
      total: orderData.total || 0,
      customerName: orderData.customerName || 'Cliente'
    });

    let totalNotificationsSent = 0;

    // Enviar notificación a cada admin
    for (const adminUserId of adminsResult.adminUserIds) {
      try {
        // Obtener tokens del admin
        const tokensResult = await tokenManager.getActiveTokensForUser(adminUserId);
        if (!tokensResult.success || tokensResult.tokens.length === 0) {
          console.log(`[AdminNotifications] No active tokens for admin ${adminUserId}`);
          continue;
        }

        // Enviar a todos los dispositivos del admin
        const tokens = tokensResult.tokens.map(t => t.token);
        const sendResult = await fcmService.sendMulticast(tokens, notification, data);

        if (sendResult.success && sendResult.successCount > 0) {
          totalNotificationsSent += sendResult.successCount;

          // Actualizar estadísticas (fire-and-forget)
          statsTracker.incrementSent(adminUserId, 'web', 'admin_new_order').catch(err =>
            console.error('[AdminNotifications] Stats update failed:', err)
          );
        }

      } catch (error) {
        // Si falla para un admin, continuar con los demás
        console.error(`[AdminNotifications] Error sending to admin ${adminUserId}:`, error);
      }
    }

    console.log(`[AdminNotifications] admin.new_order: Sent ${totalNotificationsSent} notifications to ${adminsResult.adminUserIds.length} admins`);

    return {
      success: true,
      notificationsSent: totalNotificationsSent,
      adminsNotified: adminsResult.adminUserIds.length
    };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[AdminNotifications] handleNewOrder error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido cancelado
 */
async function handleOrderCancelled(orderId, orderData, options) {
  try {
    // Obtener todos los admins
    const adminsResult = await getAdminUserIds();
    if (!adminsResult.success || adminsResult.adminUserIds.length === 0) {
      console.log('[AdminNotifications] No admin users found');
      return { success: true, notificationsSent: 0 };
    }

    // Construir notificación
    const { notification, data } = notificationBuilder.buildAdminNotification('admin.order_cancelled', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase(),
      customerName: orderData.customerName || 'Cliente'
    });

    let totalNotificationsSent = 0;

    // Enviar notificación a cada admin
    for (const adminUserId of adminsResult.adminUserIds) {
      try {
        const tokensResult = await tokenManager.getActiveTokensForUser(adminUserId);
        if (!tokensResult.success || tokensResult.tokens.length === 0) {
          continue;
        }

        const tokens = tokensResult.tokens.map(t => t.token);
        const sendResult = await fcmService.sendMulticast(tokens, notification, data);

        if (sendResult.success && sendResult.successCount > 0) {
          totalNotificationsSent += sendResult.successCount;

          statsTracker.incrementSent(adminUserId, 'web', 'admin_order_cancelled').catch(err =>
            console.error('[AdminNotifications] Stats update failed:', err)
          );
        }

      } catch (error) {
        console.error(`[AdminNotifications] Error sending to admin ${adminUserId}:`, error);
      }
    }

    console.log(`[AdminNotifications] admin.order_cancelled: Sent ${totalNotificationsSent} notifications to ${adminsResult.adminUserIds.length} admins`);

    return {
      success: true,
      notificationsSent: totalNotificationsSent,
      adminsNotified: adminsResult.adminUserIds.length
    };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[AdminNotifications] handleOrderCancelled error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleEvent,
  getAdminUserIds,
  // Exportar handlers individuales para testing
  handleNewOrder,
  handleOrderCancelled
};
