/**
 * @file driver-notifications.test.js
 * @description Tests para driver notifications trigger
 * @module __tests__/triggers/driver-notifications
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const driverNotifications = require('../../triggers/driver-notifications');

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

describe('DriverNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    tokenManager.getActiveTokensForUser.mockResolvedValue({
      success: true,
      tokens: [
        { token: 'driver-fcm-token-1', platform: 'android' },
        { token: 'driver-fcm-token-2', platform: 'web' }
      ]
    });

    notificationBuilder.buildDriverNotification.mockReturnValue({
      notification: {
        title: 'Driver Test Notification',
        body: 'Driver Test Body'
      },
      data: {
        type: 'driver',
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
      it('should route driver.order_assigned to handleOrderAssigned', async () => {
        const result = await driverNotifications.handleEvent('driver.order_assigned', {
          orderId: 'order123',
          driverId: 'driver123',
          orderData: { total: 350, orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
        expect(result.notificationsSent).toBe(2);
        expect(notificationBuilder.buildDriverNotification).toHaveBeenCalledWith(
          'driver.order_assigned',
          expect.objectContaining({
            orderId: 'order123',
            orderNumber: 'ORD-001',
            total: 350
          })
        );
      });

      it('should route driver.order_ready to handleOrderReady', async () => {
        const result = await driverNotifications.handleEvent('driver.order_ready', {
          orderId: 'order123',
          driverId: 'driver123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
        expect(notificationBuilder.buildDriverNotification).toHaveBeenCalledWith(
          'driver.order_ready',
          expect.any(Object)
        );
      });

      it('should route driver.order_cancelled to handleOrderCancelled', async () => {
        const result = await driverNotifications.handleEvent('driver.order_cancelled', {
          orderId: 'order123',
          driverId: 'driver123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
      });

      it('should route driver.order_updated to handleOrderUpdated', async () => {
        const result = await driverNotifications.handleEvent('driver.order_updated', {
          orderId: 'order123',
          driverId: 'driver123',
          orderData: { orderNumber: 'ORD-001' }
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Validation', () => {
      it('should require orderId', async () => {
        const result = await driverNotifications.handleEvent('driver.order_assigned', {
          driverId: 'driver123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('orderId is required');
      });

      it('should require driverId', async () => {
        const result = await driverNotifications.handleEvent('driver.order_assigned', {
          orderId: 'order123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('driverId is required');
      });

      it('should throw error for unknown action when skipErrorHandling is true', async () => {
        await expect(
          driverNotifications.handleEvent('driver.unknown', {
            orderId: 'order123',
            driverId: 'driver123',
            orderData: {}
          }, { skipErrorHandling: true })
        ).rejects.toThrow('Unknown driver event action: unknown');
      });

      it('should return error object for unknown action when skipErrorHandling is false', async () => {
        const result = await driverNotifications.handleEvent('driver.unknown', {
          orderId: 'order123',
          driverId: 'driver123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown driver event action');
      });
    });

    describe('Order Data Fetching', () => {
      it('should fetch order data from Firestore if not provided', async () => {
        admin.__mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ total: 500, orderNumber: 'ORD-002' })
        });

        const result = await driverNotifications.handleEvent('driver.order_assigned', {
          orderId: 'order123',
          driverId: 'driver123'
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

        const result = await driverNotifications.handleEvent('driver.order_assigned', {
          orderId: 'nonexistent',
          driverId: 'driver123'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Order not found');
      });
    });
  });

  describe('handleOrderAssigned()', () => {
    it('should send notification successfully', async () => {
      const result = await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
        { total: 350, orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(tokenManager.getActiveTokensForUser).toHaveBeenCalledWith('driver123');
      expect(notificationBuilder.buildDriverNotification).toHaveBeenCalledWith(
        'driver.order_assigned',
        {
          orderId: 'order123',
          orderNumber: 'ORD-001',
          total: 350
        }
      );
      expect(fcmService.sendMulticast).toHaveBeenCalledWith(
        ['driver-fcm-token-1', 'driver-fcm-token-2'],
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle driver with no active tokens', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
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

      const result = await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });

    it('should update statistics after successful send', async () => {
      await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
        { total: 350, orderNumber: 'ORD-001' },
        {}
      );

      expect(statsTracker.incrementSent).toHaveBeenCalledWith('driver123', 'web', 'driver_order_assigned');
    });

    it('should not update statistics if no notifications sent', async () => {
      fcmService.sendMulticast.mockResolvedValueOnce({
        success: true,
        successCount: 0,
        failureCount: 2
      });

      await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
        { total: 350 },
        {}
      );

      expect(statsTracker.incrementSent).not.toHaveBeenCalled();
    });

    it('should use orderId substring as orderNumber if not provided', async () => {
      await driverNotifications.handleOrderAssigned(
        'abcdef123456',
        'driver123',
        { total: 350 }, // Sin orderNumber
        {}
      );

      expect(notificationBuilder.buildDriverNotification).toHaveBeenCalledWith(
        'driver.order_assigned',
        expect.objectContaining({
          orderNumber: 'ABCDEF12' // Primeros 8 chars en mayúsculas
        })
      );
    });
  });

  describe('handleOrderReady()', () => {
    it('should send notification successfully', async () => {
      const result = await driverNotifications.handleOrderReady(
        'order123',
        'driver123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(notificationBuilder.buildDriverNotification).toHaveBeenCalledWith(
        'driver.order_ready',
        expect.objectContaining({
          orderId: 'order123',
          orderNumber: 'ORD-001'
        })
      );
    });

    it('should handle driver with no tokens', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await driverNotifications.handleOrderReady(
        'order123',
        'driver123',
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });
  });

  describe('handleOrderCancelled()', () => {
    it('should send notification successfully', async () => {
      const result = await driverNotifications.handleOrderCancelled(
        'order123',
        'driver123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });

    it('should handle driver with no tokens', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await driverNotifications.handleOrderCancelled(
        'order123',
        'driver123',
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });
  });

  describe('handleOrderUpdated()', () => {
    it('should send notification successfully', async () => {
      const result = await driverNotifications.handleOrderUpdated(
        'order123',
        'driver123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
    });

    it('should handle driver with no tokens', async () => {
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await driverNotifications.handleOrderUpdated(
        'order123',
        'driver123',
        {},
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle FCM service errors gracefully', async () => {
      fcmService.sendMulticast.mockRejectedValueOnce(new Error('FCM API error'));

      const result = await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('FCM API error');
    });

    it('should throw errors when skipErrorHandling is true', async () => {
      fcmService.sendMulticast.mockRejectedValueOnce(new Error('FCM API error'));

      await expect(
        driverNotifications.handleOrderAssigned(
          'order123',
          'driver123',
          { total: 350 },
          { skipErrorHandling: true }
        )
      ).rejects.toThrow('FCM API error');
    });

    it('should handle stats tracker errors gracefully', async () => {
      statsTracker.incrementSent.mockRejectedValueOnce(new Error('Stats error'));

      // No debe lanzar error - fire-and-forget
      const result = await driverNotifications.handleOrderAssigned(
        'order123',
        'driver123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true); // La notificación se envió exitosamente
      expect(result.notificationsSent).toBe(2);
    });
  });
});
