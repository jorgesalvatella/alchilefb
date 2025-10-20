const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Enhanced mock for Firestore
jest.mock('firebase-admin', () => {
  const mockAdd = jest.fn(() => Promise.resolve({ id: 'new-product-id' }));
  const mockUpdate = jest.fn(() => Promise.resolve());
  const mockDocGet = jest.fn(() => Promise.resolve({ exists: true, data: () => ({ name: 'Test Product' }) }));

  const mockCollectionGet = jest.fn(() => Promise.resolve({
    empty: false,
    docs: [
      {
        id: 'prod-1',
        data: () => ({ name: 'Featured Product 1', isFeatured: true }),
      },
      {
        id: 'prod-2',
        data: () => ({ name: 'Featured Product 2', isFeatured: true }),
      },
    ],
  }));

  const queryMock = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockCollectionGet,
  };

  const firestoreMock = {
    collection: jest.fn(() => ({
      ...queryMock, // Spread the chainable methods
      add: mockAdd,
      doc: jest.fn(() => ({
        update: mockUpdate,
        get: mockDocGet,
      })),
    })),
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    auth: () => ({ verifyIdToken: jest.fn() }),
    app: () => ({ delete: jest.fn() }),
    // Expose mocks for assertions
    __mockAdd: mockAdd,
    __mockUpdate: mockUpdate,
    __mockDocGet: mockDocGet,
    __mockCollectionGet: mockCollectionGet,
    __queryMock: queryMock,
  };
});

jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split('Bearer ')[1];
    if (token === 'test-admin-token') {
      req.user = { uid: 'test-admin-uid', email: 'admin@test.com', admin: true };
    } else if (token === 'test-regular-user-token') {
      req.user = { uid: 'test-uid-regular', email: 'user@test.com' };
    }
  }
  next();
}));

describe('Sale Products API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/control/productos-venta', () => {
    const newProductData = {
      name: 'Taco de Pastor',
      price: 25.50,
      description: 'El clásico taco al pastor',
      businessUnitId: 'bu-123',
      departmentId: 'dep-456',
      categoriaVentaId: 'cat-789',
      isTaxable: true,
    };

    it('should return 403 Forbidden if user is not an admin', async () => {
      const response = await request(app)
        .post('/api/control/productos-venta')
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(newProductData);
      expect(response.statusCode).toBe(403);
    });

    it('should return 201 Created and calculate basePrice for a taxable product', async () => {
      const response = await request(app)
        .post('/api/control/productos-venta')
        .set('Authorization', 'Bearer test-admin-token')
        .send(newProductData);

      expect(response.statusCode).toBe(201);
      const expectedBasePrice = 25.50 / 1.16;
      expect(admin.__mockAdd).toHaveBeenCalledWith(expect.objectContaining({ basePrice: expect.closeTo(expectedBasePrice) }));
    });
  });

  describe('PUT /api/control/productos-venta/:id', () => {
    const productId = 'test-product-id';
    const updateData = { name: 'Taco de Suadero', price: 35.00, businessUnitId: 'bu-123', departmentId: 'dep-456', categoriaVentaId: 'cat-789', isTaxable: true };

    it('should return 403 Forbidden if user is not an admin', async () => {
      const response = await request(app).put(`/api/control/productos-venta/${productId}`).set('Authorization', 'Bearer test-regular-user-token').send(updateData);
      expect(response.statusCode).toBe(403);
    });

    it('should return 200 OK on successful update', async () => {
      const response = await request(app).put(`/api/control/productos-venta/${productId}`).set('Authorization', 'Bearer test-admin-token').send(updateData);
      expect(response.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalled();
    });
  });

  describe('PUT /api/control/productos-venta/:id/toggle-featured', () => {
    const productId = 'test-product-id';

    it('should return 403 Forbidden if user is not an admin', async () => {
      const response = await request(app).put(`/api/control/productos-venta/${productId}/toggle-featured`).set('Authorization', 'Bearer test-regular-user-token').send({ isFeatured: true });
      expect(response.statusCode).toBe(403);
    });

    it('should return 400 Bad Request if isFeatured is not a boolean', async () => {
      const response = await request(app).put(`/api/control/productos-venta/${productId}/toggle-featured`).set('Authorization', 'Bearer test-admin-token').send({ isFeatured: 'not-a-boolean' });
      expect(response.statusCode).toBe(400);
    });

    it('should return 200 OK and update isFeatured to true', async () => {
      const response = await request(app).put(`/api/control/productos-venta/${productId}/toggle-featured`).set('Authorization', 'Bearer test-admin-token').send({ isFeatured: true });
      expect(response.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({ isFeatured: true, updatedAt: expect.any(Date) });
    });

    it('should return 200 OK and update isFeatured to false', async () => {
      const response = await request(app).put(`/api/control/productos-venta/${productId}/toggle-featured`).set('Authorization', 'Bearer test-admin-token').send({ isFeatured: false });
      expect(response.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({ isFeatured: false, updatedAt: expect.any(Date) });
    });
  });

  describe('GET /api/productos-venta/latest', () => {
    it('should return 200 OK and a list of featured products', async () => {
      const response = await request(app).get('/api/productos-venta/latest');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
      expect(response.body[0].name).toBe('Featured Product 1');
    });

    it('should correctly build the Firestore query for featured products', async () => {
      await request(app).get('/api/productos-venta/latest');
      expect(admin.firestore().collection).toHaveBeenCalledWith('productosDeVenta');
      expect(admin.__queryMock.where).toHaveBeenCalledWith('deletedAt', '==', null);
      expect(admin.__queryMock.where).toHaveBeenCalledWith('isFeatured', '==', true);
      expect(admin.__queryMock.where).toHaveBeenCalledWith('isAvailable', '==', true);
      expect(admin.__queryMock.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(admin.__queryMock.limit).toHaveBeenCalledWith(4);
      expect(admin.__mockCollectionGet).toHaveBeenCalled();
    });
  });
});