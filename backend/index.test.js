const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de Firestore con la función 'add' expuesta
jest.mock('firebase-admin', () => {
  // 1. Definimos la función mock PRIMERO
  const mockAdd = jest.fn(() => Promise.resolve({ id: 'new-doc-id' }));

  // 2. La usamos en nuestra simulación de firestore
  const firestoreMock = {
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        forEach: (callback) => callback({ id: 'unit1', data: () => ({ name: 'Test Unit' }) }),
      }),
      add: mockAdd, // Usamos la función mock
    })),
  };

  // 3. Retornamos todo, incluyendo la función mock para poder espiarla
  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    auth: () => ({ verifyIdToken: jest.fn() }),
    app: () => ({ delete: jest.fn() }),
    __mockAdd: mockAdd, // La exponemos
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split('Bearer ')[1];
    if (token === 'test-super-admin-token') {
      req.user = { uid: 'test-uid', email: 'admin@test.com', super_admin: true };
    } else if (token === 'test-regular-user-token') {
      req.user = { uid: 'test-uid-regular', email: 'user@test.com' };
    }
  }
  next();
}));


describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await admin.app().delete();
  });

  // ... (pruebas GET sin cambios)
  describe('GET /', () => {
    it('should respond with a welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('Hello from the Al Chile API Backend!');
    });
  });

  describe('POST /api/control/unidades-de-negocio', () => {
    const newBusinessUnit = { name: 'Test', razonSocial: 'Test SA de CV', address: '', phone: '', taxIdUrl: '' };

    it('should return 403 Forbidden if user is not a super_admin', async () => {
        const response = await request(app)
          .post('/api/control/unidades-de-negocio')
          .set('Authorization', 'Bearer test-regular-user-token')
          .send(newBusinessUnit);
        expect(response.statusCode).toBe(403);
      });
  
      it('should return 400 Bad Request if required fields are missing', async () => {
        const response = await request(app)
          .post('/api/control/unidades-de-negocio')
          .set('Authorization', 'Bearer test-super-admin-token')
          .send({ name: 'Only Name' }); // Falta razonSocial
        expect(response.statusCode).toBe(400);
      });

    it('should return 201 Created and the new document if successful', async () => {
      const response = await request(app)
        .post('/api/control/unidades-de-negocio')
        .set('Authorization', 'Bearer test-super-admin-token')
        .send(newBusinessUnit);

      expect(response.statusCode).toBe(201);
      expect(admin.__mockAdd).toHaveBeenCalledWith(
        expect.objectContaining(newBusinessUnit)
      );
      expect(response.body).toEqual(expect.objectContaining({
        id: 'new-doc-id',
        ...newBusinessUnit,
        deleted: false,
        createdAt: expect.any(String)
      }));
    });
  });
});