/**
 * Driver Notifications Trigger - Al Chile FB
 *
 * Maneja todas las notificaciones relacionadas con REPARTIDORES.
 *
 * Eventos soportados:
 * - driver.order_assigned: Nuevo pedido asignado al repartidor
 * - driver.order_ready: Pedido listo para recoger
 * - driver.order_cancelled: Pedido cancelado (tenía repartidor asignado)
 * - driver.order_updated: Admin modificó el pedido
 */

const admin = require('firebase-admin');
const fcmService = require('../fcm/fcm-service');
const notificationBuilder = require('../fcm/notification-builder');
const statsTracker = require('../fcm/stats-tracker');
const tokenManager = require('../fcm/token-manager');

const db = admin.firestore();

/**
 * Handler principal para eventos de repartidores
 *
 * @param {string} eventType - Tipo de evento (ej: 'driver.order_assigned')
 * @param {object} eventData - Datos del evento
 * @param {string} eventData.orderId - ID del pedido
 * @param {string} eventData.driverId - ID del repartidor (userId con claim repartidor)
 * @param {object} eventData.orderData - Datos completos del pedido (opcional)
 * @param {object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, notificationsSent?: number}>}
 */
async function handleEvent(eventType, eventData, options = {}) {
  try {
    console.log(`[DriverNotifications] Handling event: ${eventType}`, eventData);

    // Validación
    if (!eventData.orderId) {
      throw new Error('orderId is required');
    }

    if (!eventData.driverId) {
      throw new Error('driverId is required');
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
      case 'order_assigned':
        return await handleOrderAssigned(eventData.orderId, eventData.driverId, orderData, options);

      case 'order_ready':
        return await handleOrderReady(eventData.orderId, eventData.driverId, orderData, options);

      case 'order_cancelled':
        return await handleOrderCancelled(eventData.orderId, eventData.driverId, orderData, options);

      case 'order_updated':
        return await handleOrderUpdated(eventData.orderId, eventData.driverId, orderData, options);

      default:
        throw new Error(`Unknown driver event action: ${action}`);
    }

  } catch (error) {
    if (options.skipErrorHandling) {
      throw error;
    }

    console.error(`[DriverNotifications] Error handling ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido asignado a repartidor
 */
async function handleOrderAssigned(orderId, driverId, orderData, options) {
  try {
    // Obtener tokens del repartidor
    const tokensResult = await tokenManager.getActiveTokensForUser(driverId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      console.log(`[DriverNotifications] No active tokens for driver ${driverId}`);
      return { success: true, notificationsSent: 0 };
    }

    // Construir notificación
    const { notification, data } = notificationBuilder.buildDriverNotification('driver.order_assigned', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase(),
      total: orderData.total || 0
    });

    // Enviar a todos los dispositivos del repartidor
    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    // Actualizar estadísticas (fire-and-forget)
    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(driverId, 'web', 'driver_order_assigned').catch(err =>
        console.error('[DriverNotifications] Stats update failed:', err)
      );
    }

    console.log(`[DriverNotifications] driver.order_assigned: Sent ${sendResult.successCount} notifications`);

    return {
      success: true,
      notificationsSent: sendResult.successCount
    };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[DriverNotifications] handleOrderAssigned error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido listo para recoger
 */
async function handleOrderReady(orderId, driverId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(driverId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildDriverNotification('driver.order_ready', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(driverId, 'web', 'driver_order_ready').catch(err =>
        console.error('[DriverNotifications] Stats update failed:', err)
      );
    }

    console.log(`[DriverNotifications] driver.order_ready: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[DriverNotifications] handleOrderReady error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido cancelado (tenía repartidor asignado)
 */
async function handleOrderCancelled(orderId, driverId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(driverId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildDriverNotification('driver.order_cancelled', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(driverId, 'web', 'driver_order_cancelled').catch(err =>
        console.error('[DriverNotifications] Stats update failed:', err)
      );
    }

    console.log(`[DriverNotifications] driver.order_cancelled: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[DriverNotifications] handleOrderCancelled error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido actualizado por admin
 */
async function handleOrderUpdated(orderId, driverId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(driverId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildDriverNotification('driver.order_updated', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(driverId, 'web', 'driver_order_updated').catch(err =>
        console.error('[DriverNotifications] Stats update failed:', err)
      );
    }

    console.log(`[DriverNotifications] driver.order_updated: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[DriverNotifications] handleOrderUpdated error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleEvent,
  // Exportar handlers individuales para testing
  handleOrderAssigned,
  handleOrderReady,
  handleOrderCancelled,
  handleOrderUpdated
};
