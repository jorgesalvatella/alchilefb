/**
 * Trigger Dispatcher - Al Chile FB
 *
 * Módulo centralizado para despachar eventos de notificación a los triggers apropiados.
 * Implementa el patrón "fire-and-forget" para que los errores de notificaciones
 * no afecten las operaciones principales del negocio.
 *
 * Uso:
 *   await triggerDispatcher.dispatch('order.created', { orderId, orderData, userId });
 *   await triggerDispatcher.dispatch('driver.order_assigned', { orderId, driverId });
 */

const orderNotifications = require('./order-notifications');
const driverNotifications = require('./driver-notifications');
const adminNotifications = require('./admin-notifications');

/**
 * Despacha un evento a los triggers apropiados
 *
 * @param {string} eventType - Tipo de evento (ej: 'order.created', 'driver.order_assigned')
 * @param {object} eventData - Datos del evento
 * @param {object} options - Opciones adicionales
 * @param {boolean} options.skipErrorHandling - Si es true, lanza errores en lugar de silenciarlos (útil para tests)
 * @returns {Promise<{success: boolean, results?: object, error?: string}>}
 */
async function dispatch(eventType, eventData = {}, options = {}) {
  const startTime = Date.now();

  try {
    // Validación básica
    if (!eventType || typeof eventType !== 'string') {
      const error = new Error('eventType is required and must be a string');
      if (options.skipErrorHandling) throw error;
      console.error('[TriggerDispatcher] Invalid eventType:', eventType);
      return { success: false, error: error.message };
    }

    // Log del evento
    console.log(`[TriggerDispatcher] Dispatching event: ${eventType}`, {
      eventData: JSON.stringify(eventData).substring(0, 200), // Truncar para logs
      timestamp: new Date().toISOString()
    });

    // Determinar qué triggers deben ejecutarse basándose en el prefijo del evento
    const [category, action] = eventType.split('.');

    if (!category || !action) {
      const error = new Error(`Invalid event format: ${eventType}. Expected format: 'category.action'`);
      if (options.skipErrorHandling) throw error;
      console.error('[TriggerDispatcher]', error.message);
      return { success: false, error: error.message };
    }

    const results = {};

    // Dispatch a los triggers apropiados
    switch (category) {
      case 'order':
        results.order = await orderNotifications.handleEvent(eventType, eventData, options);
        break;

      case 'driver':
        results.driver = await driverNotifications.handleEvent(eventType, eventData, options);
        break;

      case 'admin':
        results.admin = await adminNotifications.handleEvent(eventType, eventData, options);
        break;

      default:
        const error = new Error(`Unknown event category: ${category}`);
        if (options.skipErrorHandling) throw error;
        console.error('[TriggerDispatcher]', error.message);
        return { success: false, error: error.message };
    }

    const duration = Date.now() - startTime;
    console.log(`[TriggerDispatcher] Event dispatched successfully: ${eventType} (${duration}ms)`, results);

    return { success: true, results };

  } catch (error) {
    const duration = Date.now() - startTime;

    if (options.skipErrorHandling) {
      throw error;
    }

    // Fire-and-forget: loguear pero no lanzar error
    console.error('[TriggerDispatcher] Error dispatching event:', {
      eventType,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    return { success: false, error: error.message };
  }
}

/**
 * Helper: Despacha múltiples eventos en paralelo
 *
 * @param {Array<{eventType: string, eventData: object}>} events - Array de eventos
 * @param {object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, results: Array, failedCount: number}>}
 */
async function dispatchBatch(events, options = {}) {
  if (!Array.isArray(events) || events.length === 0) {
    console.warn('[TriggerDispatcher] dispatchBatch called with empty or invalid events array');
    return { success: true, results: [], failedCount: 0 };
  }

  console.log(`[TriggerDispatcher] Dispatching batch of ${events.length} events`);

  const promises = events.map(event =>
    dispatch(event.eventType, event.eventData, options)
      .catch(err => ({ success: false, error: err.message }))
  );

  const results = await Promise.all(promises);
  const failedCount = results.filter(r => !r.success).length;

  console.log(`[TriggerDispatcher] Batch completed: ${results.length - failedCount}/${results.length} successful`);

  return {
    success: failedCount === 0,
    results,
    failedCount
  };
}

/**
 * Helper: Lista de eventos soportados
 * Útil para validación y documentación
 */
const SUPPORTED_EVENTS = {
  order: [
    'order.created',
    'order.preparing',
    'order.driver_assigned',
    'order.in_delivery',
    'order.delivered',
    'order.cancelled'
  ],
  driver: [
    'driver.order_assigned',
    'driver.order_ready',
    'driver.order_cancelled',
    'driver.order_updated'
  ],
  admin: [
    'admin.new_order',
    'admin.order_cancelled'
  ]
};

/**
 * Valida si un evento es soportado
 *
 * @param {string} eventType - Tipo de evento
 * @returns {boolean}
 */
function isEventSupported(eventType) {
  if (!eventType || typeof eventType !== 'string') {
    return false;
  }
  const [category, action] = eventType.split('.');
  return SUPPORTED_EVENTS[category]?.includes(eventType) || false;
}

/**
 * Obtiene la lista de eventos soportados (copia profunda)
 *
 * @returns {object}
 */
function getSupportedEvents() {
  return {
    order: [...SUPPORTED_EVENTS.order],
    driver: [...SUPPORTED_EVENTS.driver],
    admin: [...SUPPORTED_EVENTS.admin]
  };
}

module.exports = {
  dispatch,
  dispatchBatch,
  isEventSupported,
  getSupportedEvents,
  SUPPORTED_EVENTS
};
