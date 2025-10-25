// Mock de firebase-admin
const mockFirestore = {
  collection: jest.fn(() => mockFirestore),
  doc: jest.fn(() => mockFirestore),
  get: jest.fn(() => ({ exists: false, data: jest.fn(() => ({})) })),
  update: jest.fn(),
  set: jest.fn(),
  where: jest.fn(() => mockFirestore),
  limit: jest.fn(() => mockFirestore),
  FieldValue: {
    serverTimestamp: jest.fn(),
    arrayUnion: jest.fn(),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn(() => ({ toDate: () => new Date() })),
  },
};

const mockAuth = {
  verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-user-uid', repartidor: true })),
  getUser: jest.fn(() => Promise.resolve({ uid: 'test-user-id', customClaims: { admin: true } })),
};

// Referencia al mock para acceso directo en tests
const mockVerifyIdToken = mockAuth.verifyIdToken;

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: Object.assign(
    jest.fn(() => mockFirestore),
    {
      FieldValue: mockFirestore.FieldValue,
      Timestamp: mockFirestore.Timestamp,
    }
  ),
  auth: jest.fn(() => mockAuth),
}));

const authMiddleware = require('./authMiddleware');

describe('authMiddleware - Security Critical', () => {
  let req, res, next;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockVerifyIdToken.mockReset();

    // Setup request, response, next
    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    next = jest.fn();
  });

  describe('Authentication Validation', () => {
    it('should return 401 if Authorization header is missing', async () => {
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Unauthorized: Missing or invalid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header does not start with "Bearer "', async () => {
      req.headers.authorization = 'InvalidFormat token123';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Unauthorized: Missing or invalid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header is just "Bearer " without token', async () => {
      req.headers.authorization = 'Bearer ';
      // Firebase intentará verificar un string vacío y fallará
      mockVerifyIdToken.mockRejectedValue(new Error('Empty token'));

      await authMiddleware(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Unauthorized: Invalid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      mockVerifyIdToken.mockRejectedValue(new Error('Token verification failed'));

      await authMiddleware(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-token');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Unauthorized: Invalid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      req.headers.authorization = 'Bearer expired-token';
      const expiredError = new Error('Token expired');
      expiredError.code = 'auth/id-token-expired';
      mockVerifyIdToken.mockRejectedValue(expiredError);

      await authMiddleware(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('expired-token');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Unauthorized: Invalid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is revoked', async () => {
      req.headers.authorization = 'Bearer revoked-token';
      const revokedError = new Error('Token revoked');
      revokedError.code = 'auth/id-token-revoked';
      mockVerifyIdToken.mockRejectedValue(revokedError);

      await authMiddleware(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('revoked-token');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Successful Authentication', () => {
    it('should call next() and attach user to req with valid token', async () => {
      const mockDecodedToken = {
        uid: 'test-user-123',
        email: 'test@example.com',
        email_verified: true,
      };

      req.headers.authorization = 'Bearer valid-token';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await authMiddleware(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should attach user with custom claims (super_admin)', async () => {
      const mockDecodedToken = {
        uid: 'admin-user-456',
        email: 'admin@example.com',
        super_admin: true,
      };

      req.headers.authorization = 'Bearer admin-token';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(mockDecodedToken);
      expect(req.user.super_admin).toBe(true);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should attach user with custom claims (repartidor)', async () => {
      const mockDecodedToken = {
        uid: 'driver-user-789',
        email: 'driver@example.com',
        repartidor: true,
      };

      req.headers.authorization = 'Bearer driver-token';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(mockDecodedToken);
      expect(req.user.repartidor).toBe(true);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should attach user with multiple custom claims', async () => {
      const mockDecodedToken = {
        uid: 'multi-role-user',
        email: 'multi@example.com',
        super_admin: true,
        repartidor: true,
        customClaim1: 'value1',
      };

      req.headers.authorization = 'Bearer multi-role-token';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(mockDecodedToken);
      expect(req.user.super_admin).toBe(true);
      expect(req.user.repartidor).toBe(true);
      expect(req.user.customClaim1).toBe('value1');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tokens with special characters', async () => {
      const mockDecodedToken = {
        uid: 'user-special',
        email: 'special@example.com',
      };

      req.headers.authorization = 'Bearer abc123-_DEF.456/xyz';
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await authMiddleware(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('abc123-_DEF.456/xyz');
      expect(req.user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle empty decoded token gracefully', async () => {
      req.headers.authorization = 'Bearer empty-token';
      mockVerifyIdToken.mockResolvedValue({});

      await authMiddleware(req, res, next);

      expect(req.user).toEqual({});
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle case-sensitive "Bearer" prefix (lowercase "bearer" should fail)', async () => {
      req.headers.authorization = 'bearer valid-token';

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Unauthorized: Missing or invalid token.',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Authorization header with extra spaces', async () => {
      req.headers.authorization = 'Bearer  token-with-spaces  ';
      const mockDecodedToken = {
        uid: 'user-spaces',
        email: 'spaces@example.com',
      };
      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await authMiddleware(req, res, next);

      // El token extraído será ' token-with-spaces  ' (con espacios)
      expect(mockVerifyIdToken).toHaveBeenCalledWith(' token-with-spaces  ');
      expect(req.user).toEqual(mockDecodedToken);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security Logging', () => {
    it('should log error when token verification fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      req.headers.authorization = 'Bearer invalid-token';
      const error = new Error('Verification failed');
      mockVerifyIdToken.mockRejectedValue(error);

      await authMiddleware(req, res, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error verifying Firebase ID token:',
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
