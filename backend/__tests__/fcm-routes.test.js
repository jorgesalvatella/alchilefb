/**
 * @file fcm-routes.test.js
 * @description Tests de integración para los endpoints API de FCM
 * @module __tests__/fcm-routes
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const request = require('supertest');
const app = require('../app');
const admin = require('firebase-admin');
const tokenManager = require('../fcm/token-manager');
const statsTracker = require('../fcm/stats-tracker');

// Mocks
jest.mock('../fcm/token-manager');
jest.mock('../fcm/stats-tracker');

// Mock de authMiddleware para tests
jest.mock('../authMiddleware', () => (req, res, next) => {
  // Simular usuario autenticado
  if (req.headers.authorization === 'Bearer valid-token') {
    req.user = {
      uid: 'test-user-123',
      email: 'test@example.com',
    };
    next();
  } else if (req.headers.authorization === 'Bearer admin-token') {
    req.user = {
      uid: 'admin-user-123',
      email: 'admin@example.com',
      super_admin: true,
    };
    next();
  } else {
    res.status(401).send({ message: 'Unauthorized' });
  }
});

describe('FCM API Routes', () => {
  describe('POST /api/fcm/register-token', () => {
    it('should register a new token successfully', async () => {
      tokenManager.registerToken.mockResolvedValueOnce({
        success: true,
        tokenId: 'new-token-id-123',
        action: 'created',
      });

      const response = await request(app)
        .post('/api/fcm/register-token')
        .set('Authorization', 'Bearer valid-token')
        .send({
          token: 'fcm-token-xyz-long-string-for-testing-minimum-length-requirement',
          platform: 'web',
          deviceInfo: {
            userAgent: 'Mozilla/5.0...',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tokenId).toBe('new-token-id-123');
      expect(response.body.message).toContain('Token registered successfully');

      expect(tokenManager.registerToken).toHaveBeenCalledWith({
        userId: 'test-user-123',
        token: 'fcm-token-xyz-long-string-for-testing-minimum-length-requirement',
        platform: 'web',
        deviceInfo: {
          userAgent: 'Mozilla/5.0...',
        },
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/fcm/register-token')
        .send({
          token: 'fcm-token-xyz-long-string-for-testing-minimum-length-requirement',
          platform: 'web',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/fcm/register-token')
        .set('Authorization', 'Bearer valid-token')
        .send({
          platform: 'web',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('token');
    });

    it('should return 400 if platform is missing', async () => {
      const response = await request(app)
        .post('/api/fcm/register-token')
        .set('Authorization', 'Bearer valid-token')
        .send({
          token: 'fcm-token-xyz-long-string-for-testing-minimum-length-requirement',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('platform');
    });

    it('should handle token registration failure', async () => {
      tokenManager.registerToken.mockResolvedValueOnce({
        success: false,
        error: 'User has reached the maximum number of tokens',
      });

      const response = await request(app)
        .post('/api/fcm/register-token')
        .set('Authorization', 'Bearer valid-token')
        .send({
          token: 'fcm-token-xyz-long-string-for-testing-minimum-length-requirement',
          platform: 'web',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('maximum number of tokens');
    });
  });

  describe('DELETE /api/fcm/unregister-token', () => {
    it('should unregister a token successfully', async () => {
      tokenManager.deleteToken.mockResolvedValueOnce({
        success: true,
      });

      const response = await request(app)
        .delete('/api/fcm/unregister-token')
        .set('Authorization', 'Bearer valid-token')
        .send({
          tokenId: 'token-id-to-delete',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Token unregistered successfully');

      expect(tokenManager.deleteToken).toHaveBeenCalledWith('token-id-to-delete', 'test-user-123');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete('/api/fcm/unregister-token')
        .send({
          tokenId: 'token-id-to-delete',
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 if tokenId is missing', async () => {
      const response = await request(app)
        .delete('/api/fcm/unregister-token')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('tokenId');
    });

    it('should handle token deletion failure', async () => {
      tokenManager.deleteToken.mockResolvedValueOnce({
        success: false,
        error: 'Token not found',
      });

      const response = await request(app)
        .delete('/api/fcm/unregister-token')
        .set('Authorization', 'Bearer valid-token')
        .send({
          tokenId: 'non-existent-token',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Token not found');
    });
  });

  describe('GET /api/fcm/stats', () => {
    it('should return user stats', async () => {
      const mockStats = {
        totalSent: 10,
        totalDelivered: 8,
        totalClicked: 3,
        totalFailed: 2,
        byPlatform: {
          web: { sent: 5, delivered: 4, clicked: 2 },
        },
        byType: {
          order_status: { sent: 6, delivered: 5, clicked: 2 },
        },
      };

      statsTracker.getStatsForUser.mockResolvedValueOnce({
        success: true,
        stats: mockStats,
      });

      const response = await request(app)
        .get('/api/fcm/stats')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual(mockStats);

      expect(statsTracker.getStatsForUser).toHaveBeenCalledWith('test-user-123');
    });

    it('should return global stats for admins', async () => {
      const mockGlobalStats = {
        totalSent: 1000,
        totalDelivered: 900,
        totalClicked: 300,
        totalFailed: 100,
      };

      statsTracker.getGlobalStats.mockResolvedValueOnce({
        success: true,
        stats: mockGlobalStats,
      });

      const response = await request(app)
        .get('/api/fcm/stats?scope=global')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual(mockGlobalStats);

      expect(statsTracker.getGlobalStats).toHaveBeenCalled();
    });

    it('should return 403 if non-admin tries to get global stats', async () => {
      const response = await request(app)
        .get('/api/fcm/stats?scope=global')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Admin access required');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/fcm/stats');

      expect(response.status).toBe(401);
    });
  });
});
