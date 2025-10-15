const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');
const authMiddleware = require('./authMiddleware');

// Mock dinámico y robusto de firebase-admin
jest.mock('firebase-admin', () => {
  const mockFileExists = jest.fn();
  const mockGetSignedUrl = jest.fn();
  const mockGetMetadata = jest.fn();
  const mockSetMetadata = jest.fn();

  const mockFileMethods = {
    exists: mockFileExists,
    getSignedUrl: mockGetSignedUrl,
    getMetadata: mockGetMetadata,
    setMetadata: mockSetMetadata,
  };

  const mockBucket = {
    file: jest.fn(() => mockFileMethods),
    name: 'test-bucket',
  };

  const storageMock = {
    bucket: jest.fn(() => mockBucket),
  };
  
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [], forEach: () => {} }),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    doc: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(),
  };

  // Exponer funciones internas del mock de Firestore para controlarlas en las pruebas
  firestoreMock.__mockGet = firestoreMock.get;
  firestoreMock.__mockAdd = firestoreMock.add;
  firestoreMock.__mockUpdate = firestoreMock.update;


  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    storage: () => storageMock,
    auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }) }),
    app: () => ({ delete: jest.fn() }),
    __mockFileExists: mockFileExists,
    __mockGetSignedUrl: mockGetSignedUrl,
    __mockGetMetadata: mockGetMetadata,
    __mockSetMetadata: mockSetMetadata,
  };
});

// Mock dinámico del middleware de autenticación
jest.mock('./authMiddleware');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configuración por defecto: simula un usuario no autenticado
    authMiddleware.mockImplementation((req, res, next) => {
      // Si una prueba específica no sobreescribe esto, se denegará el acceso.
      return res.status(401).send({ message: 'Unauthorized: Mock missing user.' });
    });
  });

  describe('GET /api/me/orders', () => {
    it('should return 401 Unauthorized for unauthenticated users', async () => {
      const response = await request(app).get('/api/me/orders');
      expect(response.statusCode).toBe(401);
    });

    it('should return 200 OK and an array for authenticated regular users', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { uid: 'test-uid-regular', email: 'user@test.com' };
        next();
      });
      admin.firestore().get.mockResolvedValue({ 
        empty: false,
        docs: [{ id: 'order1', data: () => ({ total: 100 }) }] 
      });
      const response = await request(app).get('/api/me/orders');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/me/orders/:id', () => {
    const orderId = 'test-order-id';

    it('should return 401 for unauthenticated users', async () => {
      const response = await request(app).get(`/api/me/orders/${orderId}`);
      expect(response.statusCode).toBe(401);
    });

    it('should return 404 Not Found if the order belongs to another user', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { uid: 'test-uid-regular' };
        next();
      });
      admin.firestore().get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: 'another-user-id' }),
      });
      const response = await request(app).get(`/api/me/orders/${orderId}`);
      expect(response.statusCode).toBe(404);
    });

    it('should return 200 OK and the order data if the user is the owner', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { uid: 'test-uid-regular' };
        next();
      });
      const mockOrder = { userId: 'test-uid-regular', totalVerified: 100 };
      admin.firestore().get.mockResolvedValue({
        exists: true,
        data: () => mockOrder,
      });
      const response = await request(app).get(`/api/me/orders/${orderId}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining(mockOrder));
    });
  });
});
