/**
 * @file notification-builder.test.js
 * @description Tests para el constructor de notificaciones FCM
 * @module __tests__/fcm/notification-builder
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const notificationBuilder = require('../../fcm/notification-builder');

describe('Notification Builder', () => {
  describe('buildOrderNotification()', () => {
    it('should build notification for order created event', () => {
      const event = 'order.created';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
        total: 350,
        customerName: 'Juan Pérez',
      };

      const result = notificationBuilder.buildOrderNotification(event, orderData);

      expect(result).toHaveProperty('notification');
      expect(result).toHaveProperty('data');
      expect(result.notification.title).toBe('¡Pedido Confirmado!');
      expect(result.notification.body).toContain('ORD-123');
      expect(result.notification.body).toContain('$350');
      expect(result.data.type).toBe('order');
      expect(result.data.event).toBe('order.created');
      expect(result.data.orderId).toBe('123');
      expect(result.data.clickAction).toBe('/mis-pedidos/123');
    });

    it('should build notification for order preparing event', () => {
      const event = 'order.preparing';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildOrderNotification(event, orderData);

      expect(result.notification.title).toBe('Estamos Preparando tu Pedido');
      expect(result.notification.body).toContain('ORD-123');
      expect(result.notification.body).toContain('preparado');
    });

    it('should build notification for driver assigned event', () => {
      const event = 'order.driver_assigned';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
        driverName: 'Carlos García',
      };

      const result = notificationBuilder.buildOrderNotification(event, orderData);

      expect(result.notification.title).toBe('Repartidor Asignado');
      expect(result.notification.body).toContain('Carlos García');
      expect(result.notification.body).toContain('en camino');
    });

    it('should build notification for in delivery event', () => {
      const event = 'order.in_delivery';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildOrderNotification(event, orderData);

      expect(result.notification.title).toBe('Pedido en Camino');
      expect(result.notification.body).toContain('llegar');
    });

    it('should build notification for delivered event', () => {
      const event = 'order.delivered';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildOrderNotification(event, orderData);

      expect(result.notification.title).toBe('¡Pedido Entregado!');
      expect(result.notification.body).toContain('Disfruta');
      expect(result.notification.body).toContain('Califica');
    });

    it('should build notification for cancelled event', () => {
      const event = 'order.cancelled';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildOrderNotification(event, orderData);

      expect(result.notification.title).toBe('Pedido Cancelado');
      expect(result.notification.body).toContain('cancelado');
    });

    it('should throw error for unknown order event', () => {
      expect(() => {
        notificationBuilder.buildOrderNotification('order.unknown', {});
      }).toThrow('Unknown order event');
    });
  });

  describe('buildDriverNotification()', () => {
    it('should build notification for order assigned to driver', () => {
      const event = 'driver.order_assigned';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
        total: 450,
      };

      const result = notificationBuilder.buildDriverNotification(event, orderData);

      expect(result.notification.title).toBe('Nuevo Pedido Asignado');
      expect(result.notification.body).toContain('ORD-123');
      expect(result.notification.body).toContain('$450');
      expect(result.data.type).toBe('driver');
      expect(result.data.clickAction).toBe('/repartidor/pedidos/123');
    });

    it('should build notification for order ready for pickup', () => {
      const event = 'driver.order_ready';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildDriverNotification(event, orderData);

      expect(result.notification.title).toBe('Pedido Listo');
      expect(result.notification.body).toContain('listo para recoger');
    });

    it('should build notification for order cancelled', () => {
      const event = 'driver.order_cancelled';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildDriverNotification(event, orderData);

      expect(result.notification.title).toBe('Pedido Cancelado');
      expect(result.notification.body).toContain('cancelado');
    });

    it('should build notification for reminder', () => {
      const event = 'driver.reminder';
      const data = {
        pendingCount: 2,
      };

      const result = notificationBuilder.buildDriverNotification(event, data);

      expect(result.notification.title).toBe('Recordatorio');
      expect(result.notification.body).toContain('2 pedidos pendientes');
    });

    it('should build notification for order updated', () => {
      const event = 'driver.order_updated';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
      };

      const result = notificationBuilder.buildDriverNotification(event, orderData);

      expect(result.notification.title).toBe('Pedido Actualizado');
      expect(result.notification.body).toContain('cambios');
    });
  });

  describe('buildAdminNotification()', () => {
    it('should build notification for new order', () => {
      const event = 'admin.new_order';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
        total: 550,
        customerName: 'María López',
      };

      const result = notificationBuilder.buildAdminNotification(event, orderData);

      expect(result.notification.title).toBe('Nuevo Pedido');
      expect(result.notification.body).toContain('ORD-123');
      expect(result.notification.body).toContain('$550');
      expect(result.notification.body).toContain('María López');
      expect(result.data.type).toBe('admin');
      expect(result.data.clickAction).toBe('/control/pedidos?id=123');
    });

    it('should build notification for unassigned order', () => {
      const event = 'admin.order_unassigned';
      const orderData = {
        orderId: '123',
        orderNumber: 'ORD-123',
        minutesWaiting: 10,
      };

      const result = notificationBuilder.buildAdminNotification(event, orderData);

      expect(result.notification.title).toBe('⚠️ Pedido Sin Asignar');
      expect(result.notification.body).toContain('10 min sin repartidor');
    });

    it('should build notification for inactive driver', () => {
      const event = 'admin.driver_inactive';
      const data = {
        driverName: 'Pedro Ramírez',
        minutesInactive: 30,
      };

      const result = notificationBuilder.buildAdminNotification(event, data);

      expect(result.notification.title).toBe('⚠️ Repartidor Inactivo');
      expect(result.notification.body).toContain('Pedro Ramírez');
      expect(result.notification.body).toContain('30 min');
      expect(result.data.clickAction).toBe('/control/repartidores');
    });

    it('should build notification for low stock', () => {
      const event = 'admin.low_stock';
      const data = {
        productName: 'Tortillas',
        stockRemaining: 5,
      };

      const result = notificationBuilder.buildAdminNotification(event, data);

      expect(result.notification.title).toBe('⚠️ Stock Bajo');
      expect(result.notification.body).toContain('Tortillas');
      expect(result.notification.body).toContain('5 unidades');
    });

    it('should build notification for high traffic', () => {
      const event = 'admin.high_traffic';
      const data = {
        orderCount: 15,
        timeWindow: '1 hora',
      };

      const result = notificationBuilder.buildAdminNotification(event, data);

      expect(result.notification.title).toBe('📊 Mucho Tráfico');
      expect(result.notification.body).toContain('15 pedidos');
      expect(result.notification.body).toContain('1 hora');
    });
  });

  describe('buildPromotionNotification()', () => {
    it('should build promotion notification', () => {
      const promotionData = {
        title: '20% de descuento en tacos',
        description: 'Solo por hoy, todos los tacos tienen 20% de descuento',
        promotionId: 'promo-123',
      };

      const result = notificationBuilder.buildPromotionNotification(promotionData);

      expect(result.notification.title).toBe('🔥 Nueva Promoción');
      expect(result.notification.body).toContain('20% de descuento en tacos');
      expect(result.data.type).toBe('promotion');
      expect(result.data.promotionId).toBe('promo-123');
      expect(result.data.clickAction).toBe('/menu');
    });
  });

  describe('buildCustomNotification()', () => {
    it('should build custom notification with provided data', () => {
      const title = 'Custom Title';
      const body = 'Custom Body';
      const data = {
        customField: 'customValue',
        clickAction: '/custom-path',
      };

      const result = notificationBuilder.buildCustomNotification(title, body, data);

      expect(result.notification.title).toBe('Custom Title');
      expect(result.notification.body).toBe('Custom Body');
      expect(result.data.customField).toBe('customValue');
      expect(result.data.clickAction).toBe('/custom-path');
    });

    it('should handle missing data parameter', () => {
      const result = notificationBuilder.buildCustomNotification('Title', 'Body');

      expect(result.notification.title).toBe('Title');
      expect(result.notification.body).toBe('Body');
      expect(result.data).toEqual({});
    });
  });
});
