/**
 * @file notification-builder.js
 * @description Constructor de payloads de notificaciones FCM con templates
 * @module fcm/notification-builder
 *
 * Responsable de:
 * - Construir payloads de notificaciones para diferentes eventos
 * - Templates personalizados por tipo de usuario (cliente, repartidor, admin)
 * - Agregar data payload para deep linking
 * - Personalización con variables dinámicas
 *
 * Agente: Nexus (Backend)
 */

/**
 * Construye una notificación para eventos de pedidos (clientes)
 * @param {string} event - Tipo de evento ('order.created', 'order.preparing', etc.)
 * @param {Object} orderData - Datos del pedido
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildOrderNotification(event, orderData) {
  const { orderId, orderNumber, total, customerName, driverName } = orderData;

  let notification;
  let clickAction = `/mis-pedidos/${orderId}`;

  switch (event) {
    case 'order.created':
      notification = {
        title: '¡Pedido Confirmado!',
        body: `Tu pedido ${orderNumber} ha sido recibido. Total: $${total} MXN`,
      };
      break;

    case 'order.preparing':
      notification = {
        title: 'Estamos Preparando tu Pedido',
        body: `Tu pedido ${orderNumber} está siendo preparado`,
      };
      break;

    case 'order.driver_assigned':
      notification = {
        title: 'Repartidor Asignado',
        body: `${driverName} está en camino con tu pedido`,
      };
      break;

    case 'order.in_delivery':
      notification = {
        title: 'Pedido en Camino',
        body: 'Tu pedido está por llegar',
      };
      break;

    case 'order.delivered':
      notification = {
        title: '¡Pedido Entregado!',
        body: '¡Disfruta tu comida! Califica tu experiencia',
      };
      break;

    case 'order.cancelled':
      notification = {
        title: 'Pedido Cancelado',
        body: `Tu pedido ${orderNumber} ha sido cancelado`,
      };
      break;

    default:
      throw new Error(`Unknown order event: ${event}`);
  }

  return {
    notification,
    data: {
      type: 'order',
      event,
      orderId: orderId || '',
      orderNumber: orderNumber || '',
      clickAction,
    },
  };
}

/**
 * Construye una notificación para eventos de repartidores
 * @param {string} event - Tipo de evento ('driver.order_assigned', etc.)
 * @param {Object} orderData - Datos del pedido o información adicional
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildDriverNotification(event, orderData) {
  const { orderId, orderNumber, total, pendingCount } = orderData;

  let notification;
  let clickAction = orderId ? `/repartidor/pedidos/${orderId}` : '/repartidor/dashboard';

  switch (event) {
    case 'driver.order_assigned':
      notification = {
        title: 'Nuevo Pedido Asignado',
        body: `Tienes un nuevo pedido ${orderNumber} - $${total} MXN`,
      };
      break;

    case 'driver.order_ready':
      notification = {
        title: 'Pedido Listo',
        body: `Pedido ${orderNumber} listo para recoger`,
      };
      break;

    case 'driver.order_cancelled':
      notification = {
        title: 'Pedido Cancelado',
        body: `El pedido ${orderNumber} ha sido cancelado`,
      };
      clickAction = '/repartidor/dashboard';
      break;

    case 'driver.reminder':
      notification = {
        title: 'Recordatorio',
        body: `Tienes ${pendingCount} pedidos pendientes de entregar`,
      };
      clickAction = '/repartidor/dashboard';
      break;

    case 'driver.order_updated':
      notification = {
        title: 'Pedido Actualizado',
        body: `El admin realizó cambios en el pedido ${orderNumber}`,
      };
      break;

    default:
      throw new Error(`Unknown driver event: ${event}`);
  }

  return {
    notification,
    data: {
      type: 'driver',
      event,
      orderId: orderId || '',
      orderNumber: orderNumber || '',
      clickAction,
    },
  };
}

/**
 * Construye una notificación para eventos de administradores
 * @param {string} event - Tipo de evento ('admin.new_order', etc.)
 * @param {Object} data - Datos del evento
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildAdminNotification(event, data) {
  const {
    orderId,
    orderNumber,
    total,
    customerName,
    minutesWaiting,
    driverName,
    minutesInactive,
    productName,
    stockRemaining,
    orderCount,
    timeWindow,
  } = data;

  let notification;
  let clickAction = '/control/pedidos';

  switch (event) {
    case 'admin.new_order':
      notification = {
        title: 'Nuevo Pedido',
        body: `Pedido ${orderNumber} - $${total} MXN - ${customerName}`,
      };
      clickAction = `/control/pedidos?id=${orderId}`;
      break;

    case 'admin.order_unassigned':
      notification = {
        title: '⚠️ Pedido Sin Asignar',
        body: `Pedido ${orderNumber} lleva ${minutesWaiting} min sin repartidor`,
      };
      clickAction = `/control/pedidos?id=${orderId}`;
      break;

    case 'admin.driver_inactive':
      notification = {
        title: '⚠️ Repartidor Inactivo',
        body: `${driverName} lleva ${minutesInactive} min sin actualizar ubicación`,
      };
      clickAction = '/control/repartidores';
      break;

    case 'admin.low_stock':
      notification = {
        title: '⚠️ Stock Bajo',
        body: `${productName}: quedan ${stockRemaining} unidades`,
      };
      clickAction = '/control/inventario';
      break;

    case 'admin.high_traffic':
      notification = {
        title: '📊 Mucho Tráfico',
        body: `${orderCount} pedidos en la última ${timeWindow}`,
      };
      clickAction = '/control/pedidos';
      break;

    default:
      throw new Error(`Unknown admin event: ${event}`);
  }

  return {
    notification,
    data: {
      type: 'admin',
      event,
      orderId: orderId || '',
      clickAction,
    },
  };
}

/**
 * Construye una notificación de promoción
 * @param {Object} promotionData - Datos de la promoción
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildPromotionNotification(promotionData) {
  const { title, description, promotionId } = promotionData;

  return {
    notification: {
      title: '🔥 Nueva Promoción',
      body: title,
    },
    data: {
      type: 'promotion',
      promotionId: promotionId || '',
      clickAction: '/menu',
    },
  };
}

/**
 * Construye una notificación de verificación de teléfono
 * @param {string} code - Código de verificación de 6 dígitos
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildPhoneVerificationNotification(code) {
  return {
    notification: {
      title: 'Código de Verificación - Al Chile FB',
      body: `Tu código de verificación es: ${code}\n\nExpira en 10 minutos`,
    },
    data: {
      type: 'phone_verification',
      code,
      clickAction: '/verificar-telefono',
    },
  };
}

/**
 * Construye una notificación personalizada
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {Object} [data] - Data payload adicional
 * @returns {{notification: {title: string, body: string}, data: Object}}
 */
function buildCustomNotification(title, body, data = {}) {
  return {
    notification: {
      title,
      body,
    },
    data: data || {},
  };
}

module.exports = {
  buildOrderNotification,
  buildDriverNotification,
  buildAdminNotification,
  buildPromotionNotification,
  buildPhoneVerificationNotification,
  buildCustomNotification,
};
