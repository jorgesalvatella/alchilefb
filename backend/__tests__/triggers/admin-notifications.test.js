/**
 * @file admin-notifications.test.js
 * @description Tests para admin notifications trigger
 * @module __tests__/triggers/admin-notifications
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const adminNotifications = require('../../triggers/admin-notifications');

// Mocks
jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({
    get: mockGet
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    where: jest.fn().mockReturnThis(),
    get: jest.fn()
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

describe('AdminNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    tokenManager.getActiveTokensForUser.mockResolvedValue({
      success: true,
      tokens: [
        { token: 'admin-fcm-token-1', platform: 'web' }
      ]
    });

    notificationBuilder.buildAdminNotification.mockReturnValue({
      notification: {
        title: 'Admin Test Notification',
        body: 'Admin Test Body'
      },
      data: {
        type: 'admin',
        orderId: 'test123'
      }
    });

    fcmService.sendMulticast.mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 0
    });

    statsTracker.incrementSent.mockResolvedValue({ success: true });
  });

  describe('handleEvent()', () => {
    describe('Event Routing', () => {
      beforeEach(() => {
        // Mock getAdminUserIds to return test admins
        const mockUsersSnapshot = {
          forEach: jest.fn((callback) => {
            callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
            callback({ id: 'admin2', data: () => ({ isSuperAdmin: true, deleted: false }) });
          })
        };

        const mockCollection = admin.firestore().collection;
        mockCollection.mockReturnValue({
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue(mockUsersSnapshot)
        });
      });

      it('should route admin.new_order to handleNewOrder', async () => {
        const result = await adminNotifications.handleEvent('admin.new_order', {
          orderId: 'order123',
          orderData: { total: 350, orderNumber: 'ORD-001', customerName: 'Juan' }
        });

        expect(result.success).toBe(true);
        expect(result.notificationsSent).toBeGreaterThan(0);
        expect(result.adminsNotified).toBe(2);
        expect(notificationBuilder.buildAdminNotification).toHaveBeenCalledWith(
          'admin.new_order',
          expect.objectContaining({
            orderId: 'order123',
            orderNumber: 'ORD-001',
            total: 350,
            customerName: 'Juan'
          })
        );
      });

      it('should route admin.order_cancelled to handleOrderCancelled', async () => {
        const result = await adminNotifications.handleEvent('admin.order_cancelled', {
          orderId: 'order123',
          orderData: { orderNumber: 'ORD-001', customerName: 'Juan' }
        });

        expect(result.success).toBe(true);
        expect(notificationBuilder.buildAdminNotification).toHaveBeenCalledWith(
          'admin.order_cancelled',
          expect.any(Object)
        );
      });
    });

    describe('Validation', () => {
      it('should require orderId', async () => {
        const result = await adminNotifications.handleEvent('admin.new_order', {
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('orderId is required');
      });

      it('should throw error for unknown action when skipErrorHandling is true', async () => {
        await expect(
          adminNotifications.handleEvent('admin.unknown', {
            orderId: 'order123',
            orderData: {}
          }, { skipErrorHandling: true })
        ).rejects.toThrow('Unknown admin event action: unknown');
      });

      it('should return error object for unknown action when skipErrorHandling is false', async () => {
        const result = await adminNotifications.handleEvent('admin.unknown', {
          orderId: 'order123',
          orderData: {}
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown admin event action');
      });
    });

    describe('Order Data Fetching', () => {
      beforeEach(() => {
        // Mock empty admins list para estos tests
        const mockCollection = admin.firestore().collection;
        mockCollection.mockReturnValue({
          doc: jest.fn(() => ({
            get: admin.__mockGet
          })),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockResolvedValue({
            forEach: jest.fn()
          })
        });
      });

      it('should fetch order data from Firestore if not provided', async () => {
        admin.__mockGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({ total: 500, orderNumber: 'ORD-002' })
        });

        const result = await adminNotifications.handleEvent('admin.new_order', {
          orderId: 'order123'
          // Sin orderData
        });

        expect(result.success).toBe(true);
      });

      it('should return error if order not found in Firestore', async () => {
        admin.__mockGet.mockResolvedValueOnce({
          exists: false
        });

        const result = await adminNotifications.handleEvent('admin.new_order', {
          orderId: 'nonexistent'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Order not found');
      });
    });
  });

  describe('getAdminUserIds()', () => {
    it('should return admin users with isAdmin flag', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
          callback({ id: 'user2', data: () => ({ isAdmin: false, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.getAdminUserIds();

      expect(result.success).toBe(true);
      expect(result.adminUserIds).toEqual(['admin1']);
    });

    it('should return admin users with isSuperAdmin flag', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'superadmin1', data: () => ({ isSuperAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.getAdminUserIds();

      expect(result.success).toBe(true);
      expect(result.adminUserIds).toEqual(['superadmin1']);
    });

    it('should return both isAdmin and isSuperAdmin users', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
          callback({ id: 'superadmin1', data: () => ({ isSuperAdmin: true, deleted: false }) });
          callback({ id: 'user1', data: () => ({ isAdmin: false, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.getAdminUserIds();

      expect(result.success).toBe(true);
      expect(result.adminUserIds).toEqual(['admin1', 'superadmin1']);
    });

    it('should return empty array when no admins found', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'user1', data: () => ({ isAdmin: false, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.getAdminUserIds();

      expect(result.success).toBe(true);
      expect(result.adminUserIds).toEqual([]);
    });

    it('should handle Firestore errors', async () => {
      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('Firestore error'))
      });

      const result = await adminNotifications.getAdminUserIds();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Firestore error');
    });
  });

  describe('handleNewOrder()', () => {
    it('should send notifications to multiple admins', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
          callback({ id: 'admin2', data: () => ({ isSuperAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350, orderNumber: 'ORD-001', customerName: 'Juan Pérez' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2); // 1 notification per admin
      expect(result.adminsNotified).toBe(2);
      expect(tokenManager.getActiveTokensForUser).toHaveBeenCalledWith('admin1');
      expect(tokenManager.getActiveTokensForUser).toHaveBeenCalledWith('admin2');
    });

    it('should handle case when no admins exist', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn() // Sin admins
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });

    it('should handle admin with no active tokens', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: []
      });

      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
      expect(result.adminsNotified).toBe(1);
    });

    it('should continue sending if one admin fails', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
          callback({ id: 'admin2', data: () => ({ isSuperAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      // Primer admin falla, segundo admin exitoso
      tokenManager.getActiveTokensForUser
        .mockResolvedValueOnce({
          success: true,
          tokens: [{ token: 'admin1-token' }]
        })
        .mockResolvedValueOnce({
          success: true,
          tokens: [{ token: 'admin2-token' }]
        });

      fcmService.sendMulticast
        .mockRejectedValueOnce(new Error('FCM error'))
        .mockResolvedValueOnce({
          success: true,
          successCount: 1,
          failureCount: 0
        });

      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(1); // Solo el segundo admin
      expect(result.adminsNotified).toBe(2);
    });

    it('should update statistics for each admin', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      await adminNotifications.handleNewOrder(
        'order123',
        { total: 350, orderNumber: 'ORD-001' },
        {}
      );

      expect(statsTracker.incrementSent).toHaveBeenCalledWith('admin1', 'web', 'admin_new_order');
    });

    it('should use orderId substring as orderNumber if not provided', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      await adminNotifications.handleNewOrder(
        'abcdef123456',
        { total: 350 }, // Sin orderNumber
        {}
      );

      expect(notificationBuilder.buildAdminNotification).toHaveBeenCalledWith(
        'admin.new_order',
        expect.objectContaining({
          orderNumber: 'ABCDEF12' // Primeros 8 chars en mayúsculas
        })
      );
    });

    it('should use default customerName if not provided', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 }, // Sin customerName
        {}
      );

      expect(notificationBuilder.buildAdminNotification).toHaveBeenCalledWith(
        'admin.new_order',
        expect.objectContaining({
          customerName: 'Cliente'
        })
      );
    });
  });

  describe('handleOrderCancelled()', () => {
    it('should send notifications to multiple admins', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
          callback({ id: 'admin2', data: () => ({ isSuperAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.handleOrderCancelled(
        'order123',
        { orderNumber: 'ORD-001', customerName: 'Juan' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(2);
      expect(result.adminsNotified).toBe(2);
    });

    it('should handle case when no admins exist', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn()
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      const result = await adminNotifications.handleOrderCancelled(
        'order123',
        { orderNumber: 'ORD-001' },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle getAdminUserIds errors gracefully (fire-and-forget)', async () => {
      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      // getAdminUserIds falla, pero handleNewOrder NO lanza error - retorna success: true, notificationsSent: 0
      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
    });

    it('should handle FCM errors within loop gracefully (fire-and-forget)', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      // FCM falla para el admin
      fcmService.sendMulticast.mockRejectedValueOnce(new Error('FCM error'));

      // Los errores dentro del loop se manejan gracefully - no se lanzan
      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 },
        { skipErrorHandling: true }
      );

      // Debe completar exitosamente aunque FCM falle para un admin
      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(0);
      expect(result.adminsNotified).toBe(1);
    });

    it('should handle stats tracker errors gracefully', async () => {
      const mockUsersSnapshot = {
        forEach: jest.fn((callback) => {
          callback({ id: 'admin1', data: () => ({ isAdmin: true, deleted: false }) });
        })
      };

      const mockCollection = admin.firestore().collection;
      mockCollection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue(mockUsersSnapshot)
      });

      statsTracker.incrementSent.mockRejectedValueOnce(new Error('Stats error'));

      // No debe lanzar error - fire-and-forget
      const result = await adminNotifications.handleNewOrder(
        'order123',
        { total: 350 },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.notificationsSent).toBe(1);
    });
  });
});
