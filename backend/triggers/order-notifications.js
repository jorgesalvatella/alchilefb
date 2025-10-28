/**
 * Order Notifications Trigger - Al Chile FB
 *
 * Maneja todas las notificaciones relacionadas con pedidos para CLIENTES.
 * Los eventos de admins relacionados con pedidos se manejan en admin-notifications.js
 *
 * Eventos soportados:
 * - order.created: Pedido confirmado
 * - order.preparing: Pedido en preparación
 * - order.driver_assigned: Repartidor asignado
 * - order.in_delivery: Pedido en camino
 * - order.delivered: Pedido entregado
 * - order.cancelled: Pedido cancelado
 */

const admin = require('firebase-admin');
const fcmService = require('../fcm/fcm-service');
const notificationBuilder = require('../fcm/notification-builder');
const statsTracker = require('../fcm/stats-tracker');
const tokenManager = require('../fcm/token-manager');

const db = admin.firestore();

/**
 * Handler principal para eventos de pedidos
 *
 * @param {string} eventType - Tipo de evento (ej: 'order.created')
 * @param {object} eventData - Datos del evento
 * @param {string} eventData.orderId - ID del pedido
 * @param {string} eventData.userId - ID del usuario (cliente)
 * @param {object} eventData.orderData - Datos completos del pedido (opcional)
 * @param {object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, notificationsSent?: number}>}
 */
async function handleEvent(eventType, eventData, options = {}) {
  try {
    console.log(`[OrderNotifications] Handling event: ${eventType}`, eventData);

    // Validación
    if (!eventData.orderId) {
      throw new Error('orderId is required');
    }

    if (!eventData.userId) {
      throw new Error('userId is required');
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
      case 'created':
        return await handleOrderCreated(eventData.orderId, eventData.userId, orderData, options);

      case 'preparing':
        return await handleOrderPreparing(eventData.orderId, eventData.userId, orderData, options);

      case 'driver_assigned':
        return await handleDriverAssigned(eventData.orderId, eventData.userId, orderData, options);

      case 'in_delivery':
        return await handleInDelivery(eventData.orderId, eventData.userId, orderData, options);

      case 'delivered':
        return await handleDelivered(eventData.orderId, eventData.userId, orderData, options);

      case 'cancelled':
        return await handleCancelled(eventData.orderId, eventData.userId, orderData, options);

      default:
        throw new Error(`Unknown order event action: ${action}`);
    }

  } catch (error) {
    if (options.skipErrorHandling) {
      throw error;
    }

    console.error(`[OrderNotifications] Error handling ${eventType}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido creado
 */
async function handleOrderCreated(orderId, userId, orderData, options) {
  try {
    // Obtener tokens del usuario
    const tokensResult = await tokenManager.getActiveTokensForUser(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      console.log(`[OrderNotifications] No active tokens for user ${userId}`);
      return { success: true, notificationsSent: 0 };
    }

    // Construir notificación
    const { notification, data } = notificationBuilder.buildOrderNotification('order.created', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase(),
      total: orderData.total || 0,
      customerName: orderData.customerName
    });

    // Enviar a todos los dispositivos del usuario
    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    // Actualizar estadísticas (fire-and-forget)
    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(userId, 'web', 'order_created').catch(err =>
        console.error('[OrderNotifications] Stats update failed:', err)
      );
    }

    console.log(`[OrderNotifications] order.created: Sent ${sendResult.successCount} notifications`);

    return {
      success: true,
      notificationsSent: sendResult.successCount
    };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[OrderNotifications] handleOrderCreated error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido en preparación
 */
async function handleOrderPreparing(orderId, userId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildOrderNotification('order.preparing', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(userId, 'web', 'order_preparing').catch(err =>
        console.error('[OrderNotifications] Stats update failed:', err)
      );
    }

    console.log(`[OrderNotifications] order.preparing: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[OrderNotifications] handleOrderPreparing error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Repartidor asignado
 */
async function handleDriverAssigned(orderId, userId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildOrderNotification('order.driver_assigned', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase(),
      driverName: orderData.driverName || 'Un repartidor'
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(userId, 'web', 'order_driver_assigned').catch(err =>
        console.error('[OrderNotifications] Stats update failed:', err)
      );
    }

    console.log(`[OrderNotifications] order.driver_assigned: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[OrderNotifications] handleDriverAssigned error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido en camino
 */
async function handleInDelivery(orderId, userId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildOrderNotification('order.in_delivery', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(userId, 'web', 'order_in_delivery').catch(err =>
        console.error('[OrderNotifications] Stats update failed:', err)
      );
    }

    console.log(`[OrderNotifications] order.in_delivery: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[OrderNotifications] handleInDelivery error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido entregado
 */
async function handleDelivered(orderId, userId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildOrderNotification('order.delivered', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(userId, 'web', 'order_delivered').catch(err =>
        console.error('[OrderNotifications] Stats update failed:', err)
      );
    }

    console.log(`[OrderNotifications] order.delivered: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[OrderNotifications] handleDelivered error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handler: Pedido cancelado
 */
async function handleCancelled(orderId, userId, orderData, options) {
  try {
    const tokensResult = await tokenManager.getActiveTokensForUser(userId);
    if (!tokensResult.success || tokensResult.tokens.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const { notification, data } = notificationBuilder.buildOrderNotification('order.cancelled', {
      orderId,
      orderNumber: orderData.orderNumber || orderId.substring(0, 8).toUpperCase()
    });

    const tokens = tokensResult.tokens.map(t => t.token);
    const sendResult = await fcmService.sendMulticast(tokens, notification, data);

    if (sendResult.success && sendResult.successCount > 0) {
      statsTracker.incrementSent(userId, 'web', 'order_cancelled').catch(err =>
        console.error('[OrderNotifications] Stats update failed:', err)
      );
    }

    console.log(`[OrderNotifications] order.cancelled: Sent ${sendResult.successCount} notifications`);

    return { success: true, notificationsSent: sendResult.successCount };

  } catch (error) {
    if (options.skipErrorHandling) throw error;
    console.error('[OrderNotifications] handleCancelled error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleEvent,
  // Exportar handlers individuales para testing
  handleOrderCreated,
  handleOrderPreparing,
  handleDriverAssigned,
  handleInDelivery,
  handleDelivered,
  handleCancelled
};
