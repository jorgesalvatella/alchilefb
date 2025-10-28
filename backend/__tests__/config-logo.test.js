const request = require('supertest');
const admin = require('firebase-admin');

// Mock de Firebase Admin debe estar ANTES del import de app
jest.mock('firebase-admin', () => {
  const mockSet = jest.fn();
  const mockDoc = jest.fn(() => ({
    set: mockSet,
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
  }));
  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
  }));

  // Correctly mock FieldValue so it works with the code
  function MockFieldValue() {}
  MockFieldValue.serverTimestamp = jest.fn(() => new MockFieldValue());
  mockFirestore.FieldValue = MockFieldValue;

  return {
    initializeApp: jest.fn(),
    credential: {
      applicationDefault: jest.fn(),
    },
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn(),
    })),
    firestore: mockFirestore,
    storage: {
      getStorage: jest.fn(() => ({
        bucket: jest.fn(),
      })),
    },
    mockSet,
    mockDoc,
    mockCollection,
  };
});

jest.mock('firebase-admin/storage', () => ({
  getStorage: () => require('firebase-admin').storage.getStorage(),
}));

// Mock del authMiddleware
jest.mock('../authMiddleware', () => {
  return jest.fn((req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (req.headers.authorization === 'Bearer valid-admin-token') {
      req.user = { uid: 'test-admin-uid', admin: true };
    } else if (req.headers.authorization === 'Bearer valid-super-admin-token') {
      req.user = { uid: 'test-super-admin-uid', super_admin: true };
    } else if (req.headers.authorization === 'Bearer valid-customer-token') {
      req.user = { uid: 'test-customer-uid' };
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }
    next();
  });
});

const app = require('../app');

describe('POST /api/config/init-logo', () => {
  const { mockSet, mockDoc, mockCollection } = admin;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize logo configuration as admin', async () => {
    mockSet.mockResolvedValue();

    const res = await request(app)
      .post('/api/config/init-logo')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Configuración del logo inicializada correctamente');
    expect(res.body.logoPath).toBe('logos/header-logo.png');

    expect(mockCollection).toHaveBeenCalledWith('config');
    expect(mockDoc).toHaveBeenCalledWith('site');
    expect(mockSet).toHaveBeenCalledWith(
      {
        logoPath: 'logos/header-logo.png',
        updatedAt: expect.any(Object), // MockFieldValue instance
        updatedBy: 'test-admin-uid',
      },
      { merge: true }
    );
  });

  it('should initialize logo configuration as super_admin', async () => {
    mockSet.mockResolvedValue();

    const res = await request(app)
      .post('/api/config/init-logo')
      .set('Authorization', 'Bearer valid-super-admin-token');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Configuración del logo inicializada correctamente');
    expect(res.body.logoPath).toBe('logos/header-logo.png');

    expect(mockSet).toHaveBeenCalledWith(
      {
        logoPath: 'logos/header-logo.png',
        updatedAt: expect.any(Object), // MockFieldValue instance
        updatedBy: 'test-super-admin-uid',
      },
      { merge: true }
    );
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app)
      .post('/api/config/init-logo');

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not admin', async () => {
    const res = await request(app)
      .post('/api/config/init-logo')
      .set('Authorization', 'Bearer valid-customer-token');

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Forbidden: admin or super_admin role required');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should return 500 if Firestore operation fails', async () => {
    mockSet.mockRejectedValue(new Error('Firestore error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const res = await request(app)
      .post('/api/config/init-logo')
      .set('Authorization', 'Bearer valid-admin-token');

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Error al inicializar configuración');
    expect(res.body.error).toBe('Firestore error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error al inicializar configuración del logo:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
