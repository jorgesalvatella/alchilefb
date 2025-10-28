/**
 * @file fcm-service.test.js
 * @description Tests para el servicio FCM (envío de notificaciones)
 * @module __tests__/fcm/fcm-service
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const fcmService = require('../../fcm/fcm-service');
const admin = require('firebase-admin');
const tokenManager = require('../../fcm/token-manager');

// Mock de Firebase Admin
jest.mock('firebase-admin', () => {
  const mockSend = jest.fn();
  const mockSendMulticast = jest.fn();
  const mockSendToTopic = jest.fn();

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    messaging: () => ({
      send: mockSend,
      sendMulticast: mockSendMulticast,
      sendToTopic: mockSendToTopic,
    }),
    __mockSend: mockSend,
    __mockSendMulticast: mockSendMulticast,
    __mockSendToTopic: mockSendToTopic,
  };
});

// Mock de token-manager
jest.mock('../../fcm/token-manager');

describe('FCM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendToDevice()', () => {
    it('should send notification to a single device successfully', async () => {
      const token = 'fcm-token-xyz-long-string-for-testing-minimum-length-requirement';
      const notification = {
        title: 'Test Notification',
        body: 'This is a test',
      };
      const data = {
        type: 'test',
        orderId: '123',
      };

      admin.__mockSend.mockResolvedValueOnce('message-id-123');

      const result = await fcmService.sendToDevice(token, notification, data);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-123');
      expect(admin.__mockSend).toHaveBeenCalledWith({
        token,
        notification,
        data,
      });
    });

    it('should handle invalid token error and mark token as invalid', async () => {
      const token = 'invalid-token-xyz-long-string-for-testing-minimum-length-requirement';
      const notification = { title: 'Test', body: 'Test' };

      const error = new Error('Invalid registration token');
      error.code = 'messaging/invalid-registration-token';

      admin.__mockSend.mockRejectedValueOnce(error);
      tokenManager.markTokenAsInvalid.mockResolvedValueOnce({ success: true });

      const result = await fcmService.sendToDevice(token, notification);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid registration token');
      // No debe llamar a markTokenAsInvalid porque no tenemos tokenId
      expect(tokenManager.markTokenAsInvalid).not.toHaveBeenCalled();
    });

    it('should handle token not registered error', async () => {
      const token = 'unregistered-token-xyz-long-string-for-testing-minimum-length';
      const notification = { title: 'Test', body: 'Test' };

      const error = new Error('Token not registered');
      error.code = 'messaging/registration-token-not-registered';

      admin.__mockSend.mockRejectedValueOnce(error);

      const result = await fcmService.sendToDevice(token, notification);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token not registered');
    });

    it('should handle generic FCM errors', async () => {
      const token = 'valid-token-xyz-long-string-for-testing-minimum-length-requirement';
      const notification = { title: 'Test', body: 'Test' };

      const error = new Error('Internal server error');
      error.code = 'messaging/internal-error';

      admin.__mockSend.mockRejectedValueOnce(error);

      const result = await fcmService.sendToDevice(token, notification);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal server error');
    });

    it('should validate required fields', async () => {
      const result = await fcmService.sendToDevice(null, { title: 'Test', body: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('token is required');
    });
  });

  describe('sendMulticast()', () => {
    it('should send notification to multiple devices successfully', async () => {
      const tokens = [
        'token1-xyz-long-string-for-testing-minimum-length-requirement',
        'token2-xyz-long-string-for-testing-minimum-length-requirement',
        'token3-xyz-long-string-for-testing-minimum-length-requirement',
      ];
      const notification = {
        title: 'Multicast Test',
        body: 'This is sent to multiple devices',
      };

      admin.__mockSendMulticast.mockResolvedValueOnce({
        successCount: 3,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: true, messageId: 'msg2' },
          { success: true, messageId: 'msg3' },
        ],
      });

      const result = await fcmService.sendMulticast(tokens, notification);

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(admin.__mockSendMulticast).toHaveBeenCalledWith({
        tokens,
        notification,
        data: undefined,
      });
    });

    it('should handle partial failures in multicast', async () => {
      const tokens = [
        'token1-xyz-long-string-for-testing-minimum-length-requirement',
        'token2-xyz-long-string-for-testing-minimum-length-requirement',
      ];
      const notification = { title: 'Test', body: 'Test' };

      const error1 = new Error('Invalid token');
      error1.code = 'messaging/invalid-registration-token';

      admin.__mockSendMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: false, error: error1 },
        ],
      });

      const result = await fcmService.sendMulticast(tokens, notification);

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.failedTokens).toHaveLength(1);
    });

    it('should split large batches into chunks of 500', async () => {
      // FCM límite: 500 tokens por request
      const tokens = Array.from({ length: 750 }, (_, i) =>
        `token-${i}-xyz-long-string-for-testing-minimum-length-requirement`
      );
      const notification = { title: 'Batch Test', body: 'Testing batching' };

      admin.__mockSendMulticast
        .mockResolvedValueOnce({
          successCount: 500,
          failureCount: 0,
          responses: Array(500).fill({ success: true }),
        })
        .mockResolvedValueOnce({
          successCount: 250,
          failureCount: 0,
          responses: Array(250).fill({ success: true }),
        });

      const result = await fcmService.sendMulticast(tokens, notification);

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(750);
      expect(admin.__mockSendMulticast).toHaveBeenCalledTimes(2);
    });

    it('should validate required fields', async () => {
      const result = await fcmService.sendMulticast([], { title: 'Test', body: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('tokens array cannot be empty');
    });
  });

  describe('sendToTopic()', () => {
    it('should send notification to a topic successfully', async () => {
      const topic = 'promotions';
      const notification = {
        title: 'New Promotion',
        body: '50% off on tacos!',
      };

      admin.__mockSend.mockResolvedValueOnce('message-id-topic-123');

      const result = await fcmService.sendToTopic(topic, notification);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('message-id-topic-123');
      expect(admin.__mockSend).toHaveBeenCalledWith({
        topic,
        notification,
        data: undefined,
      });
    });

    it('should validate topic name', async () => {
      const result = await fcmService.sendToTopic('', { title: 'Test', body: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('topic is required');
    });
  });

  describe('sendToUserDevices()', () => {
    it('should send notification to all user devices', async () => {
      const userId = 'user123';
      const notification = { title: 'Test', body: 'Test' };

      // Mock: getActiveTokensForUser retorna 2 tokens
      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: [
          {
            id: 'token1',
            token: 'fcm1-xyz-long-string-for-testing-minimum-length-requirement',
            platform: 'web'
          },
          {
            id: 'token2',
            token: 'fcm2-xyz-long-string-for-testing-minimum-length-requirement',
            platform: 'android'
          },
        ],
      });

      admin.__mockSendMulticast.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: true, messageId: 'msg2' },
        ],
      });

      const result = await fcmService.sendToUserDevices(userId, notification);

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
      expect(tokenManager.getActiveTokensForUser).toHaveBeenCalledWith(userId, null);
    });

    it('should filter by platform if specified', async () => {
      const userId = 'user123';
      const notification = { title: 'Test', body: 'Test' };

      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: [
          {
            id: 'token1',
            token: 'fcm1-xyz-long-string-for-testing-minimum-length-requirement',
            platform: 'web'
          },
        ],
      });

      admin.__mockSendMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'msg1' }],
      });

      const result = await fcmService.sendToUserDevices(userId, notification, null, 'web');

      expect(result.success).toBe(true);
      expect(tokenManager.getActiveTokensForUser).toHaveBeenCalledWith(userId, 'web');
    });

    it('should handle user with no tokens', async () => {
      const userId = 'user-no-tokens';
      const notification = { title: 'Test', body: 'Test' };

      tokenManager.getActiveTokensForUser.mockResolvedValueOnce({
        success: true,
        tokens: [],
      });

      const result = await fcmService.sendToUserDevices(userId, notification);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active tokens found');
    });
  });
});
