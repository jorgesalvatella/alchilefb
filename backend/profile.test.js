const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de firebase-admin
jest.mock('firebase-admin', () => {
  const mockDoc = jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ firstName: 'Test', lastName: 'User' }) }),
    update: jest.fn().mockResolvedValue(),
    delete: jest.fn().mockResolvedValue(),
  }));

  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    get: jest.fn().mockResolvedValue({
      docs: [
        { id: 'addr1', data: () => ({ streetAddress: '123 Main St' }) },
        { id: 'addr2', data: () => ({ streetAddress: '456 Oak Ave' }) },
      ],
    }),
    add: jest.fn().mockResolvedValue({ id: 'new-addr-id' }),
  }));

  const firestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ firstName: 'Test', lastName: 'User' }) }),
        update: jest.fn().mockResolvedValue(),
        collection: mockCollection,
      })),
    })),
  };

  return {
    initializeApp: jest.fn(),
    firestore: () => firestore,
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

  // --- Address Endpoints ---
  describe('GET /api/me/addresses', () => {
    it('should return a list of user addresses', async () => {
      const res = await request(app).get('/api/me/addresses');
      expect(res.statusCode).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('streetAddress', '123 Main St');
    });
  });

  describe('POST /api/me/addresses', () => {
    it('should add a new address', async () => {
      const newAddress = { streetAddress: '789 Pine Ln', city: 'Testville', state: 'TS', zipCode: '12345' };
      const res = await request(app).post('/api/me/addresses').send(newAddress);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id', 'new-addr-id');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/api/me/addresses').send({ city: 'Testville' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/me/addresses/:id', () => {
    it('should update an existing address', async () => {
      const updatedAddress = { streetAddress: '123 Updated St', city: 'Newville', state: 'NS', zipCode: '54321' };
      const res = await request(app).put('/api/me/addresses/addr1').send(updatedAddress);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/me/addresses/:id', () => {
    it('should delete an address', async () => {
      const res = await request(app).delete('/api/me/addresses/addr1');
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /api/me/addresses/set-default/:id', () => {
    it('should set a default address', async () => {
      const res = await request(app).put('/api/me/addresses/set-default/addr2');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Default address updated successfully');
    });
  });
});
