const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock completo y robusto de firebase-admin
jest.mock('firebase-admin', () => {
  const mockAuth = {
    getUser: jest.fn().mockResolvedValue({
      uid: 'test-user-uid',
      email: 'test@example.com',
    }),
  };

  const mockDoc = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ firstName: 'Test', lastName: 'User' }),
    }),
    set: jest.fn().mockResolvedValue(),
    update: jest.fn().mockResolvedValue(),
    delete: jest.fn().mockResolvedValue(),
    collection: jest.fn(() => mockCollection),
  };

  const mockCollection = {
    doc: jest.fn(() => mockDoc),
    get: jest.fn().mockResolvedValue({
      docs: [
        { id: 'addr1', data: () => ({ streetAddress: '123 Main St' }) },
        { id: 'addr2', data: () => ({ streetAddress: '456 Oak Ave' }) },
      ],
    }),
    add: jest.fn().mockResolvedValue({ id: 'new-addr-id' }),
  };

  const firestore = () => ({
    collection: jest.fn(() => mockCollection),
    doc: jest.fn(() => mockDoc),
  });

  return {
    initializeApp: jest.fn(),
    auth: () => mockAuth,
    firestore,
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  req.user = { uid: 'test-user-uid' };
  next();
}));

describe('User Profile and Addresses API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Profile Endpoints ---
  describe('GET /api/me/profile', () => {
    it('should return user profile data', async () => {
      const res = await request(app).get('/api/me/profile');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('firstName', 'Test');
    });
  });

  describe('PUT /api/me/profile', () => {
    it('should update user profile data', async () => {
      const updateData = { firstName: 'Updated', lastName: 'Name', phoneNumber: '1234567890' };
      const res = await request(app).put('/api/me/profile').send(updateData);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Profile updated successfully');
    });
  });

  // --- Address Endpoints (DEPRECATED) ---
  // Las siguientes pruebas se mantienen comentadas o eliminadas porque los
  // endpoints correspondientes están comentados en app.js
});
