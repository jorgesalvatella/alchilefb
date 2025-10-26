const request = require('supertest');
const app = require('../app');
const admin = require('firebase-admin');
const codeService = require('./code-service');

// Mock del servicio de códigos
jest.mock('./code-service', () => ({
  createVerificationCode: jest.fn(),
  verifyCode: jest.fn(),
  getActiveCode: jest.fn(),
  generateCode: jest.fn(),
  invalidateCode: jest.fn(),
  cleanupExpiredCodes: jest.fn(),
}));

// Mock de firebase-admin
jest.mock('firebase-admin', () => {
  const mockUserDoc = {
    exists: true,
    data: () => ({
      phoneNumber: '+525512345678',
      phoneVerified: false,
    }),
  };

  const mockUpdate = jest.fn().mockResolvedValue();
  const mockGet = jest.fn().mockResolvedValue(mockUserDoc);

  const firestore = jest.fn(() => ({
    collection: jest.fn((collectionName) => ({
      doc: jest.fn(() => ({
        get: mockGet,
        update: mockUpdate,
      })),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
              })),
            })),
          })),
        })),
      })),
    })),
  }));

  function MockFieldValue() {}
  MockFieldValue.serverTimestamp = jest.fn(() => new MockFieldValue());
  firestore.FieldValue = MockFieldValue;

  return {
    initializeApp: jest.fn(),
    firestore,
    mockUpdate,
    mockGet,
    mockUserDoc,
  };
});

// Mock del middleware de autenticación
jest.mock('../authMiddleware', () => jest.fn((req, res, next) => {
  req.user = { uid: 'test-user-id' };
  next();
}));

describe('Phone Verification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/verification/generate-code', () => {
    it('should generate a verification code successfully', async () => {
      const mockExpiresAt = new Date('2025-10-26T12:00:00Z');

      codeService.createVerificationCode.mockResolvedValue({
        code: '123456',
        expiresAt: mockExpiresAt,
        codeId: 'code-id-123',
      });

      const res = await request(app)
        .post('/api/verification/generate-code')
        .set('Authorization', 'Bearer valid-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        success: true,
        code: '123456',
        expiresAt: mockExpiresAt.toISOString(),
      });

      expect(codeService.createVerificationCode).toHaveBeenCalledWith(
        'test-user-id',
        '+525512345678'
      );
    });

    it('should return 400 if user has no phone number', async () => {
      // Mock usuario sin teléfono
      const { mockUserDoc } = admin;
      mockUserDoc.data = () => ({
        phoneNumber: null,
        phoneVerified: false,
      });

      const res = await request(app)
        .post('/api/verification/generate-code')
        .set('Authorization', 'Bearer valid-token');

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'no_phone_number',
        message: 'Debes registrar un número de teléfono antes de verificarlo',
      });
    });

    it('should return 404 if user does not exist', async () => {
      // Mock usuario no existe
      const { mockGet } = admin;
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const res = await request(app)
        .post('/api/verification/generate-code')
        .set('Authorization', 'Bearer valid-token');

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: 'user_not_found',
        message: 'Usuario no encontrado',
      });
    });

    it('should handle internal errors gracefully', async () => {
      // Restaurar el mock de usuario primero
      const { mockGet, mockUserDoc } = admin;
      mockUserDoc.data = () => ({
        phoneNumber: '+525512345678',
        phoneVerified: false,
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: mockUserDoc.data,
      });

      // Ahora hacer que el servicio de códigos falle
      codeService.createVerificationCode.mockRejectedValue(
        new Error('Database error')
      );

      const res = await request(app)
        .post('/api/verification/generate-code')
        .set('Authorization', 'Bearer valid-token');

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: 'internal_error',
        message: 'Error interno del servidor',
      });
    });
  });

  describe('POST /api/verification/verify-code', () => {
    beforeEach(() => {
      // Restaurar el mock de usuario para que tenga phoneNumber
      const { mockUserDoc } = admin;
      mockUserDoc.data = () => ({
        phoneNumber: '+525512345678',
        phoneVerified: false,
      });
    });

    it('should verify code successfully and update user', async () => {
      codeService.verifyCode.mockResolvedValue({
        success: true,
      });

      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '123456' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Teléfono verificado exitosamente',
      });

      expect(codeService.verifyCode).toHaveBeenCalledWith(
        'test-user-id',
        '123456'
      );

      // Verificar que se actualizó el usuario en Firestore
      const { mockUpdate } = admin;
      expect(mockUpdate).toHaveBeenCalledWith({
        phoneVerified: true,
        phoneVerifiedAt: expect.anything(),
      });
    });

    it('should return 400 if code is missing', async () => {
      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'missing_code',
        message: 'Debes proporcionar un código de verificación',
      });
    });

    it('should return 400 if code format is invalid', async () => {
      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '12345' }); // Solo 5 dígitos

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'invalid_format',
        message: 'El código debe tener 6 dígitos',
      });
    });

    it('should return 400 if code format contains non-digits', async () => {
      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '12A456' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'invalid_format',
        message: 'El código debe tener 6 dígitos',
      });
    });

    it('should return 400 if code is incorrect', async () => {
      codeService.verifyCode.mockResolvedValue({
        success: false,
        error: 'invalid_code',
        message: 'Código incorrecto',
        attemptsRemaining: 2,
      });

      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '999999' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'invalid_code',
        message: 'Código incorrecto',
        attemptsRemaining: 2,
      });

      // No debe actualizarse el usuario
      const { mockUpdate } = admin;
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return 400 if no active code exists', async () => {
      codeService.verifyCode.mockResolvedValue({
        success: false,
        error: 'no_active_code',
        message: 'No hay un código activo. Genera uno nuevo.',
      });

      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '123456' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'no_active_code',
        message: 'No hay un código activo. Genera uno nuevo.',
      });
    });

    it('should return 400 if max attempts exceeded', async () => {
      codeService.verifyCode.mockResolvedValue({
        success: false,
        error: 'max_attempts_exceeded',
        message: 'Has excedido el número máximo de intentos. Genera un nuevo código.',
      });

      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '123456' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'max_attempts_exceeded',
        message: 'Has excedido el número máximo de intentos. Genera un nuevo código.',
      });
    });

    it('should handle internal errors gracefully', async () => {
      codeService.verifyCode.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '123456' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        success: false,
        error: 'internal_error',
        message: 'Error interno del servidor',
      });
    });
  });

  describe('Integration: Generate and Verify Flow', () => {
    it('should allow full flow: generate code, then verify it', async () => {
      const mockExpiresAt = new Date('2025-10-26T12:00:00Z');

      // Step 1: Generate code
      codeService.createVerificationCode.mockResolvedValue({
        code: '123456',
        expiresAt: mockExpiresAt,
        codeId: 'code-id-123',
      });

      const generateRes = await request(app)
        .post('/api/verification/generate-code')
        .set('Authorization', 'Bearer valid-token');

      expect(generateRes.statusCode).toBe(200);
      expect(generateRes.body.code).toBe('123456');

      // Step 2: Verify code
      codeService.verifyCode.mockResolvedValue({
        success: true,
      });

      const verifyRes = await request(app)
        .post('/api/verification/verify-code')
        .set('Authorization', 'Bearer valid-token')
        .send({ code: '123456' });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);
    });
  });
});
