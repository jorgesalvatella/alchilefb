/**
 * @file token-manager.test.js
 * @description Tests para el gestor de tokens FCM
 * @module __tests__/fcm/token-manager
 *
 * Agente: Vanguard (Testing) + Nexus (Backend)
 * Cobertura objetivo: 100%
 */

const tokenManager = require('../../fcm/token-manager');
const admin = require('firebase-admin');

// Mock de Firebase Admin
jest.mock('firebase-admin', () => {
  const mockAdd = jest.fn();
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();
  const mockLimit = jest.fn();

  // Mock de QuerySnapshot
  const mockQuerySnapshot = {
    empty: false,
    size: 0,
    docs: [],
    forEach: jest.fn(),
  };

  // Mock de DocumentSnapshot
  const mockDocSnapshot = {
    exists: false,
    id: 'mock-doc-id',
    data: jest.fn(() => ({})),
  };

  // Chain de métodos de query
  const queryChain = {
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGet,
  };

  mockWhere.mockReturnValue(queryChain);
  mockOrderBy.mockReturnValue(queryChain);
  mockLimit.mockReturnValue(queryChain);
  mockGet.mockResolvedValue(mockQuerySnapshot);

  // Mock de DocumentReference
  const mockDocRef = {
    id: 'mock-generated-id', // ID generado automáticamente por Firestore
    get: jest.fn().mockResolvedValue(mockDocSnapshot),
    set: mockSet,
    update: mockUpdate,
    delete: mockDelete,
  };

  // Mock de CollectionReference
  const mockCollectionRef = {
    where: mockWhere,
    orderBy: mockOrderBy,
    limit: mockLimit,
    get: mockGet,
    add: mockAdd,
    doc: jest.fn(() => mockDocRef),
  };

  // Mock de FieldValue
  const mockFieldValue = {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  };

  // Mock de Firestore
  const mockFirestore = {
    collection: jest.fn(() => mockCollectionRef),
    FieldValue: mockFieldValue,
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => mockFirestore,
    // Exponer FieldValue como propiedad estática (para admin.firestore.FieldValue)
    firestore: Object.assign(
      () => mockFirestore,
      { FieldValue: mockFieldValue }
    ),
    __mockAdd: mockAdd,
    __mockSet: mockSet,
    __mockUpdate: mockUpdate,
    __mockDelete: mockDelete,
    __mockGet: mockGet,
    __mockWhere: mockWhere,
    __mockQuerySnapshot: mockQuerySnapshot,
    __mockDocSnapshot: mockDocSnapshot,
    __mockDocRef: mockDocRef,
  };
});

describe('Token Manager - FCM', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock snapshots
    admin.__mockQuerySnapshot.empty = false;
    admin.__mockQuerySnapshot.size = 0;
    admin.__mockQuerySnapshot.docs = [];
    admin.__mockDocSnapshot.exists = false;
  });

  describe('registerToken()', () => {
    it('should register a new token successfully', async () => {
      const tokenData = {
        userId: 'user123',
        token: 'fcm-token-abc123-xyz789-long-token-string-for-testing-minimum-length-requirement',
        platform: 'web',
        deviceInfo: {
          userAgent: 'Mozilla/5.0...',
        },
      };

      // Mock: Primer query (buscar token existente) - vacío
      // Segundo query (contar tokens del usuario) - vacío
      admin.__mockGet
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] }) // Primera consulta
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] }); // Segunda consulta

      admin.__mockSet.mockResolvedValueOnce();

      const result = await tokenManager.registerToken(tokenData);

      expect(result.success).toBe(true);
      expect(result.tokenId).toBeDefined();
      expect(result.action).toBe('created');
      expect(admin.__mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          token: 'fcm-token-abc123-xyz789-long-token-string-for-testing-minimum-length-requirement',
          platform: 'web',
          isActive: true,
          failureCount: 0,
        })
      );
    });

    it('should update existing token if already registered', async () => {
      const tokenData = {
        userId: 'user123',
        token: 'fcm-token-abc123-xyz789-long-token-string-for-testing-minimum-length-requirement',
        platform: 'web',
        deviceInfo: {},
      };

      // Mock: Token ya existe
      const existingDoc = {
        id: 'existing-token-id',
        data: () => ({
          userId: 'user123',
          token: 'fcm-token-abc123-xyz789-long-token-string-for-testing-minimum-length-requirement',
          platform: 'web',
          createdAt: new Date('2025-01-01'),
          failureCount: 0,
        }),
      };

      // Primer query (buscar token existente) - SÍ existe
      admin.__mockGet.mockResolvedValueOnce({
        empty: false,
        size: 1,
        docs: [existingDoc]
      });

      admin.__mockSet.mockResolvedValueOnce();

      const result = await tokenManager.registerToken(tokenData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(admin.__mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          token: 'fcm-token-abc123-xyz789-long-token-string-for-testing-minimum-length-requirement',
          lastUsed: 'SERVER_TIMESTAMP',
        }),
        { merge: true }
      );
    });

    it('should reject if user has reached max tokens limit', async () => {
      const tokenData = {
        userId: 'user123',
        token: 'fcm-token-new-xyz789-long-token-string-for-testing-minimum-length-requirement',
        platform: 'web',
        deviceInfo: {},
      };

      // Mock: Usuario ya tiene 10 tokens (límite)
      const existingTokens = Array.from({ length: 10 }, (_, i) => ({
        id: `token-${i}`,
        data: () => ({ token: `token-${i}`, userId: 'user123' }),
      }));

      // Primer query (buscar token existente) - no existe
      // Segundo query (contar tokens del usuario) - 10 tokens
      admin.__mockGet
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] })  // Token no existe
        .mockResolvedValueOnce({ empty: false, size: 10, docs: existingTokens }); // Usuario tiene 10 tokens

      const result = await tokenManager.registerToken(tokenData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum number of tokens');
      expect(admin.__mockSet).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        userId: 'user123',
        // Missing token
        platform: 'web',
      };

      const result = await tokenManager.registerToken(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate platform enum', async () => {
      const invalidData = {
        userId: 'user123',
        token: 'fcm-token-abc',
        platform: 'invalid-platform',
      };

      const result = await tokenManager.registerToken(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('platform');
    });
  });

  describe('deleteToken()', () => {
    it('should delete token successfully', async () => {
      admin.__mockDocSnapshot.exists = true;
      admin.__mockDocSnapshot.data.mockReturnValueOnce({
        userId: 'user123',
        token: 'fcm-token-abc',
      });
      admin.__mockUpdate.mockResolvedValueOnce();

      const result = await tokenManager.deleteToken('token-id-123', 'user123');

      expect(result.success).toBe(true);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        isActive: false,
        deletedAt: 'SERVER_TIMESTAMP',
      });
    });

    it('should reject if token does not exist', async () => {
      admin.__mockDocSnapshot.exists = false;

      const result = await tokenManager.deleteToken('non-existent-id', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject if userId does not match', async () => {
      admin.__mockDocSnapshot.exists = true;
      admin.__mockDocSnapshot.data.mockReturnValueOnce({
        userId: 'different-user',
        token: 'fcm-token-abc',
      });

      const result = await tokenManager.deleteToken('token-id-123', 'user123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('markTokenAsInvalid()', () => {
    it('should increment failure count on first failure', async () => {
      admin.__mockDocSnapshot.exists = true;
      admin.__mockDocSnapshot.data.mockReturnValueOnce({
        userId: 'user123',
        token: 'fcm-token-abc',
        failureCount: 0,
        isActive: true,
      });
      admin.__mockUpdate.mockResolvedValueOnce();

      const result = await tokenManager.markTokenAsInvalid('token-id-123');

      expect(result.success).toBe(true);
      expect(result.action).toBe('incremented');
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        failureCount: 1,
        lastFailure: 'SERVER_TIMESTAMP',
      });
    });

    it('should increment failure count on second failure', async () => {
      admin.__mockDocSnapshot.exists = true;
      admin.__mockDocSnapshot.data.mockReturnValueOnce({
        userId: 'user123',
        token: 'fcm-token-abc',
        failureCount: 1,
        isActive: true,
      });
      admin.__mockUpdate.mockResolvedValueOnce();

      const result = await tokenManager.markTokenAsInvalid('token-id-123');

      expect(result.success).toBe(true);
      expect(result.action).toBe('incremented');
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        failureCount: 2,
        lastFailure: 'SERVER_TIMESTAMP',
      });
    });

    it('should deactivate token after 3 failures', async () => {
      admin.__mockDocSnapshot.exists = true;
      admin.__mockDocSnapshot.data.mockReturnValueOnce({
        userId: 'user123',
        token: 'fcm-token-abc',
        failureCount: 2,
        isActive: true,
      });
      admin.__mockUpdate.mockResolvedValueOnce();

      const result = await tokenManager.markTokenAsInvalid('token-id-123');

      expect(result.success).toBe(true);
      expect(result.action).toBe('deactivated');
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        failureCount: 3,
        isActive: false,
        deactivatedAt: 'SERVER_TIMESTAMP',
        lastFailure: 'SERVER_TIMESTAMP',
      });
    });

    it('should handle non-existent token gracefully', async () => {
      admin.__mockDocSnapshot.exists = false;

      const result = await tokenManager.markTokenAsInvalid('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getActiveTokensForUser()', () => {
    it('should return all active tokens for a user', async () => {
      const mockTokens = [
        {
          id: 'token1',
          data: () => ({ token: 'fcm-token-1', platform: 'web', isActive: true }),
        },
        {
          id: 'token2',
          data: () => ({ token: 'fcm-token-2', platform: 'android', isActive: true }),
        },
      ];

      admin.__mockQuerySnapshot.empty = false;
      admin.__mockQuerySnapshot.docs = mockTokens;

      const result = await tokenManager.getActiveTokensForUser('user123');

      expect(result.success).toBe(true);
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].token).toBe('fcm-token-1');
      expect(result.tokens[1].platform).toBe('android');
    });

    it('should return empty array if user has no tokens', async () => {
      admin.__mockQuerySnapshot.empty = true;
      admin.__mockQuerySnapshot.docs = [];

      const result = await tokenManager.getActiveTokensForUser('user123');

      expect(result.success).toBe(true);
      expect(result.tokens).toHaveLength(0);
    });

    it('should filter by platform if specified', async () => {
      const mockTokens = [
        {
          id: 'token1',
          data: () => ({ token: 'fcm-token-1', platform: 'web', isActive: true }),
        },
      ];

      admin.__mockQuerySnapshot.empty = false;
      admin.__mockQuerySnapshot.docs = mockTokens;

      const result = await tokenManager.getActiveTokensForUser('user123', 'web');

      expect(result.success).toBe(true);
      expect(admin.__mockWhere).toHaveBeenCalledWith('platform', '==', 'web');
    });
  });

  describe('cleanupExpiredTokens()', () => {
    it('should delete tokens not used in 90 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91); // 91 días atrás

      const expiredTokens = [
        {
          id: 'old-token-1',
          ref: { delete: jest.fn().mockResolvedValue() },
          data: () => ({ lastUsed: { toDate: () => oldDate } }),
        },
        {
          id: 'old-token-2',
          ref: { delete: jest.fn().mockResolvedValue() },
          data: () => ({ lastUsed: { toDate: () => oldDate } }),
        },
      ];

      admin.__mockQuerySnapshot.empty = false;
      admin.__mockQuerySnapshot.docs = expiredTokens;

      const result = await tokenManager.cleanupExpiredTokens();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(expiredTokens[0].ref.delete).toHaveBeenCalled();
      expect(expiredTokens[1].ref.delete).toHaveBeenCalled();
    });

    it('should not delete recent tokens', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 días atrás

      const recentTokens = [
        {
          id: 'recent-token',
          ref: { delete: jest.fn() },
          data: () => ({ lastUsed: { toDate: () => recentDate } }),
        },
      ];

      admin.__mockQuerySnapshot.empty = false;
      admin.__mockQuerySnapshot.docs = recentTokens;

      const result = await tokenManager.cleanupExpiredTokens();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(recentTokens[0].ref.delete).not.toHaveBeenCalled();
    });
  });
});
