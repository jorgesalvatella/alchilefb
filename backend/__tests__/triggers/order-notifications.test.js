/**
 * @file order-notifications.test.js
 * @description Tests para order notifications trigger
 * @module __tests__/triggers/order-notifications
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const orderNotifications = require('../../triggers/order-notifications');

// Mocks
jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({
    get: mockGet
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc
  }));

  return {
    firestore: () => ({
      collection: mockCollection
    }),
    __mockCollection: mockCollection,
    __mockDoc: mockDoc,
    __mockGet: mockGet
  };
});

jest.mock('../../fcm/fcm-service');
jest.mock('../../fcm/notification-builder');
jest.mock('../../fcm/stats-tracker');
jest.mock('../../fcm/token-manager');

const admin = require('firebase-admin');
const fcmService = require('../../fcm/fcm-service');
const notificationBuilder = require('../../fcm/notification-builder');
const statsTracker = require('../../fcm/stats-tracker');
const tokenManager = require('../../fcm/token-manager');

describe('OrderNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    tokenManager.getActiveTokensForUser.mockResolvedValue({
      success: true,
      tokens: [
        { token: 'fcm-token-1', platform: 'web' },
        { token: 'fcm-token-2', platform: 'web' }
      ]
    });

    notificationBuilder.buildOrderNotification.mockReturnValue({
      notification: {
        title: 'Test Notification',
        body: 'Test Body'
      },
      data: {
        type: 'order',
        orderId: 'test123'
      }
    });

    fcmService.sendMulticast.mockResolvedValue({
      success: true,
      successCount: 2,
      failureCount: 0
    });

    statsTracker.incrementSent.mockResolvedValue({ success: true });
  });

  describe('handleEvent()', () => {
    describe('Event Routing', () => {
      it('should route order.created to handleOrderCreated', async () => {
        const result = await orderNotifications.handleEvent('order.created', {
          orderId: 'order123',
          userId: 'user123',
          orderData: { total: 350, orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
        expect(result.notificationsSent).toBe(2);
        expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
          'order.created',
          expect.objectContaining({
            orderId: 'order123',
            orderNumber: 'ORD-001',
            total: 350
          })
        );
      });

      it('should route order.preparing to handleOrderPreparing', async () => {
        const result = await orderNotifications.handleEvent('order.preparing', {
          orderId: 'order123',
          userId: 'user123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
        expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
          'order.preparing',
          expect.any(Object)
        );
      });

      it('should route order.driver_assigned to handleDriverAssigned', async () => {
        const result = await orderNotifications.handleEvent('order.driver_assigned', {
          orderId: 'order123',
          userId: 'user123',
          orderData: { orderNumber: 'ORD-001', driverName: 'Juan' }
        });

        expect(result.success).toBe(true);
        expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
          'order.driver_assigned',
          expect.objectContaining({ driverName: 'Juan' })
        );
      });

      it('should route order.in_delivery to handleInDelivery', async () => {
        const result = await orderNotifications.handleEvent('order.in_delivery', {
          orderId: 'order123',
          userId: 'user123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
      });

      it('should route order.delivered to handleDelivered', async () => {
        const result = await orderNotifications.handleEvent('order.delivered', {
          orderId: 'order123',
          userId: 'user123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
      });

      it('should route order.cancelled to handleCancelled', async () => {
        const result = await orderNotifications.handleEvent('order.cancelled', {
          orderId: 'order123',
          userId: 'user123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Validation', () => {
      it('should require orderId', async () => {
        const result = await orderNotifications.handleEvent('order.created', {
          userId: 'user123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('orderId is required');
      });

      it('should require userId', async () => {
        const result = await orderNotifications.handleEvent('order.created', {
          orderId: 'order123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('userId is required');
      });

      it('should throw error for unknown action when skipErrorHandling is true', async () => {
        await expect(
          orderNotifications.handleEvent('order.unknown', {
            orderId: 'order123',
            userId: 'user123',
            orderData: {}
          }, { skipErrorHandling: true })
        ).rejects.toThrow('Unknown order event action: unknown');
      });

      it('should return error object for unknown action when skipErrorHandling is false', async () => {
        const result = await orderNotifications.handleEvent('order.unknown', {
          orderId: 'order123',
          userId: 'user123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown order event action');
      });
    });

    describe('Order Data Fetching', () => {
      it('should fetch order data from Firestore if not provided', async () => {
        admin.__mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ total: 500, orderNumber: 'ORD-002' })
        });

        const result = await orderNotifications.handleEvent('order.created', {
          orderId: 'order123',
          userId: 'user123'
          // Sin orderData
        });

        expect(result.success).toBe(true);
        expect(admin.__mockCollection).toHaveBeenCalledWith('pedidos');
        expect(admin.__mockDoc).toHaveBeenCalledWith('order123');
        expect(admin.__mockGet).toHaveBeenCalled();
      });

      it('should return error if order not found in Firestore', async () => {
        admin.__mockGet.mockResolvedValueOnce({
          exists: false
        });

        const result = await orderNotifications.handleEvent('order.created', {
          orderId: 'nonexistent',
          userId: 'user123'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Order not found');
      });
    });
  });

  describe('handleOrderCreated()', () => {
    it('should send notification successfully', async () => {
      const result = await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350, orderNumber: 'ORD-001', customerName: 'Juan Pérez' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(tokenManager.getActiveTokensForUser).toHaveBeenCalledWith('user123');
      expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
        'order.created',
        {
          orderId: 'order123',
          orderNumber: 'ORD-001',
          total: 350,
          customerName: 'Juan Pérez'
        }
      );
      expect(fcmService.sendMulticast).toHaveBeenCalledWith(
        ['fcm-token-1', 'fcm-token-2'],
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle user with no active tokens', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
      expect(fcmService.sendMulticast).not.toHaveBeenCalled();
    });

    it('should handle tokenManager failure', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: false,
        error: 'Database error'
      });

      const result = await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });

    it('should update statistics after successful send', async () => {
      await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350, orderNumber: 'ORD-001' },
        {}
      );

      expect(statsTracker.incrementSent).toHaveBeenCalledWith('user123', 'web', 'order_created');
    });

    it('should not update statistics if no notifications sent', async () => {
      fcmService.sendMulticast.mockResolvedValueOnce({
        success: true,
        successCount: 0,
        failureCount: 2
      });

      await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350 },
        {}
      );

      expect(statsTracker.incrementSent).not.toHaveBeenCalled();
    });

    it('should use orderId substring as orderNumber if not provided', async () => {
      await orderNotifications.handleOrderCreated(
        'abcdef123456',
        'user123',
        { total: 350 }, // Sin orderNumber
        {}
      );

      expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
        'order.created',
        expect.objectContaining({
          orderNumber: 'ABCDEF12' // Primeros 8 chars en mayúsculas
        })
      );
    });
  });

  describe('handleOrderPreparing()', () => {
    it('should send notification successfully', async () => {
      const result = await orderNotifications.handleOrderPreparing(
        'order123',
        'user123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
        'order.preparing',
        expect.objectContaining({
          orderId: 'order123',
          orderNumber: 'ORD-001'
        })
      );
    });

    it('should handle user with no tokens', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await orderNotifications.handleOrderPreparing(
        'order123',
        'user123',
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });
  });

  describe('handleDriverAssigned()', () => {
    it('should send notification with driver name', async () => {
      const result = await orderNotifications.handleDriverAssigned(
        'order123',
        'user123',
        { orderNumber: 'ORD-001', driverName: 'Juan García' },
        {}
      );

      expect(result.success).toBe(true);
      expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
        'order.driver_assigned',
        expect.objectContaining({
          driverName: 'Juan García'
        })
      );
    });

    it('should use default driver name if not provided', async () => {
      const result = await orderNotifications.handleDriverAssigned(
        'order123',
        'user123',
        { orderNumber: 'ORD-001' }, // Sin driverName
        {}
      );

      expect(result.success).toBe(true);
      expect(notificationBuilder.buildOrderNotification).toHaveBeenCalledWith(
        'order.driver_assigned',
        expect.objectContaining({
          driverName: 'Un repartidor'
        })
      );
    });
  });

  describe('handleInDelivery()', () => {
    it('should send notification successfully', async () => {
      const result = await orderNotifications.handleInDelivery(
        'order123',
        'user123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });
  });

  describe('handleDelivered()', () => {
    it('should send notification successfully', async () => {
      const result = await orderNotifications.handleDelivered(
        'order123',
        'user123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });
  });

  describe('handleCancelled()', () => {
    it('should send notification successfully', async () => {
      const result = await orderNotifications.handleCancelled(
        'order123',
        'user123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle FCM service errors gracefully', async () => {
      fcmService.sendMulticast.mockRejectedValueOnce(new Error('FCM API error'));

      const result = await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('FCM API error');
    });

    it('should throw errors when skipErrorHandling is true', async () => {
      fcmService.sendMulticast.mockRejectedValueOnce(new Error('FCM API error'));

      await expect(
        orderNotifications.handleOrderCreated(
          'order123',
          'user123',
          { total: 350 },
          { skipErrorHandling: true }
        )
      ).rejects.toThrow('FCM API error');
    });

    it('should handle stats tracker errors gracefully', async () => {
      statsTracker.incrementSent.mockRejectedValueOnce(new Error('Stats error'));

      // No debe lanzar error - fire-and-forget
      const result = await orderNotifications.handleOrderCreated(
        'order123',
        'user123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true); // La notificación se envió exitosamente
      expect(result.notificationsSent).toBe(2);
    });
  });
});
