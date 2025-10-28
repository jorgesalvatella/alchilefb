/**
 * @file stats-tracker.test.js
 * @description Tests para el tracker de estadísticas FCM
 * @module __tests__/fcm/stats-tracker
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const statsTracker = require('../../fcm/stats-tracker');
const admin = require('firebase-admin');

// Mock de Firebase Admin
jest.mock('firebase-admin', () => {
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();
  const mockGet = jest.fn();

  const mockDocRef = {
    get: mockGet,
    set: mockSet,
    update: mockUpdate,
  };

  const mockIncrement = jest.fn((value) => `FIELD_INCREMENT_${value}`);

  const mockFieldValue = {
    increment: mockIncrement,
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  };

  const mockFirestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => mockDocRef),
    })),
    FieldValue: mockFieldValue,
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: Object.assign(() => mockFirestore, { FieldValue: mockFieldValue }),
    __mockSet: mockSet,
    __mockUpdate: mockUpdate,
    __mockGet: mockGet,
    __mockIncrement: mockIncrement,
    __mockDocRef: mockDocRef,
  };
});

describe('Stats Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementSent()', () => {
    it('should increment sent count for user', async () => {
      const userId = 'user123';
      const platform = 'web';
      const notificationType = 'order_status';

      admin.__mockUpdate.mockResolvedValueOnce();

      await statsTracker.incrementSent(userId, platform, notificationType);

      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        totalSent: 'FIELD_INCREMENT_1',
        [`byPlatform.${platform}.sent`]: 'FIELD_INCREMENT_1',
        [`byType.${notificationType}.sent`]: 'FIELD_INCREMENT_1',
        lastUpdated: 'SERVER_TIMESTAMP',
      });
    });

    it('should handle update errors gracefully (fire-and-forget)', async () => {
      const userId = 'user123';
      const platform = 'web';
      const notificationType = 'order_status';

      const error = new Error('Firestore error');
      admin.__mockUpdate.mockRejectedValueOnce(error);

      // No debe lanzar error, solo loguear
      await expect(
        statsTracker.incrementSent(userId, platform, notificationType)
      ).resolves.not.toThrow();
    });
  });

  describe('incrementDelivered()', () => {
    it('should increment delivered count for user', async () => {
      const userId = 'user123';
      const platform = 'android';
      const notificationType = 'driver_assigned';

      admin.__mockUpdate.mockResolvedValueOnce();

      await statsTracker.incrementDelivered(userId, platform, notificationType);

      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        totalDelivered: 'FIELD_INCREMENT_1',
        [`byPlatform.${platform}.delivered`]: 'FIELD_INCREMENT_1',
        [`byType.${notificationType}.delivered`]: 'FIELD_INCREMENT_1',
        lastUpdated: 'SERVER_TIMESTAMP',
      });
    });
  });

  describe('incrementClicked()', () => {
    it('should increment clicked count for user', async () => {
      const userId = 'user123';
      const platform = 'ios';
      const notificationType = 'promotion';

      admin.__mockUpdate.mockResolvedValueOnce();

      await statsTracker.incrementClicked(userId, platform, notificationType);

      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        totalClicked: 'FIELD_INCREMENT_1',
        [`byPlatform.${platform}.clicked`]: 'FIELD_INCREMENT_1',
        [`byType.${notificationType}.clicked`]: 'FIELD_INCREMENT_1',
        lastUpdated: 'SERVER_TIMESTAMP',
      });
    });
  });

  describe('incrementFailed()', () => {
    it('should increment failed count for user', async () => {
      const userId = 'user123';
      const platform = 'web';
      const notificationType = 'order_status';

      admin.__mockUpdate.mockResolvedValueOnce();

      await statsTracker.incrementFailed(userId, platform, notificationType);

      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        totalFailed: 'FIELD_INCREMENT_1',
        lastUpdated: 'SERVER_TIMESTAMP',
      });
    });
  });

  describe('incrementGlobalStats()', () => {
    it('should increment global stats', async () => {
      const platform = 'web';
      const notificationType = 'order_status';
      const metric = 'sent';

      admin.__mockUpdate.mockResolvedValueOnce();

      await statsTracker.incrementGlobalStats(platform, notificationType, metric);

      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        totalSent: 'FIELD_INCREMENT_1',
        [`byPlatform.${platform}.sent`]: 'FIELD_INCREMENT_1',
        [`byType.${notificationType}.sent`]: 'FIELD_INCREMENT_1',
        lastUpdated: 'SERVER_TIMESTAMP',
      });
    });
  });

  describe('getStatsForUser()', () => {
    it('should return stats for a user', async () => {
      const userId = 'user123';
      const mockStats = {
        totalSent: 10,
        totalDelivered: 8,
        totalClicked: 3,
        totalFailed: 2,
        byPlatform: {
          web: { sent: 5, delivered: 4, clicked: 2 },
          android: { sent: 5, delivered: 4, clicked: 1 },
        },
        byType: {
          order_status: { sent: 6, delivered: 5, clicked: 2 },
          promotion: { sent: 4, delivered: 3, clicked: 1 },
        },
        lastUpdated: new Date(),
      };

      admin.__mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockStats,
      });

      const result = await statsTracker.getStatsForUser(userId);

      expect(result.success).toBe(true);
      expect(result.stats).toEqual(mockStats);
    });

    it('should return empty stats if user has no stats', async () => {
      const userId = 'user-no-stats';

      admin.__mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await statsTracker.getStatsForUser(userId);

      expect(result.success).toBe(true);
      expect(result.stats).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user123';

      admin.__mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await statsTracker.getStatsForUser(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getGlobalStats()', () => {
    it('should return global stats', async () => {
      const mockGlobalStats = {
        totalSent: 1000,
        totalDelivered: 900,
        totalClicked: 300,
        totalFailed: 100,
        byPlatform: {
          web: { sent: 500, delivered: 450, clicked: 150 },
          android: { sent: 300, delivered: 270, clicked: 90 },
          ios: { sent: 200, delivered: 180, clicked: 60 },
        },
        byType: {
          order_status: { sent: 600, delivered: 540, clicked: 180 },
          driver_assigned: { sent: 200, delivered: 180, clicked: 60 },
          promotion: { sent: 200, delivered: 180, clicked: 60 },
        },
        lastUpdated: new Date(),
      };

      admin.__mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockGlobalStats,
      });

      const result = await statsTracker.getGlobalStats();

      expect(result.success).toBe(true);
      expect(result.stats).toEqual(mockGlobalStats);
    });
  });
});
