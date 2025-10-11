const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

jest.mock('firebase-admin', () => {
  const mockAdd = jest.fn(() => Promise.resolve({ id: 'new-product-id' }));
  const mockUpdate = jest.fn(() => Promise.resolve());
  const mockGet = jest.fn(() => Promise.resolve({
    exists: true,
    data: () => ({ name: 'Test Product' }),
  }));
  
  const firestoreMock = {
    collection: jest.fn(() => ({
      add: mockAdd,
      doc: jest.fn(() => ({
        update: mockUpdate,
        get: mockGet,
      })),
    })),
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    auth: () => ({ verifyIdToken: jest.fn() }),
    app: () => ({ delete: jest.fn() }),
    __mockAdd: mockAdd,
    __mockUpdate: mockUpdate,
    __mockGet: mockGet,
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

describe('POST /api/control/productos-venta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('should return 400 Bad Request if required fields are missing', async () => {
    const { name, ...incompleteData } = newProductData;
    const response = await request(app)
      .post('/api/control/productos-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(incompleteData);
      
    expect(response.statusCode).toBe(400);
    expect(response.text).toContain('Missing required fields');
  });

  it('should return 201 Created and calculate basePrice for a taxable product', async () => {
    const response = await request(app)
      .post('/api/control/productos-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(newProductData);

    expect(response.statusCode).toBe(201);
    
    const expectedBasePrice = 25.50 / 1.16;
    expect(admin.__mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        ...newProductData,
        price: 25.50,
        basePrice: expect.closeTo(expectedBasePrice),
      })
    );

    expect(response.body).toEqual(expect.objectContaining({
      id: 'new-product-id',
      ...newProductData,
    }));
    expect(response.body.basePrice).toBeCloseTo(expectedBasePrice);
  });

  it('should return 201 Created and set basePrice equal to price for a non-taxable product', async () => {
    const nonTaxableProduct = { ...newProductData, isTaxable: false, price: 30 };
    const response = await request(app)
      .post('/api/control/productos-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(nonTaxableProduct);

    expect(response.statusCode).toBe(201);
    
    expect(admin.__mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        ...nonTaxableProduct,
        price: 30,
        basePrice: 30,
      })
    );

    expect(response.body.basePrice).toBe(30);
  });
});

describe('PUT /api/control/productos-venta/:id', () => {
  const productId = 'test-product-id';
  const updateData = {
    name: 'Taco de Suadero',
    price: 35.00,
    description: 'El mejor suadero',
    businessUnitId: 'bu-123',
    departmentId: 'dep-456',
    categoriaVentaId: 'cat-789',
    isTaxable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .put(`/api/control/productos-venta/${productId}`)
      .set('Authorization', 'Bearer test-regular-user-token')
      .send(updateData);
    
    expect(response.statusCode).toBe(403);
  });

  it('should return 400 Bad Request if required fields are missing', async () => {
    const { price, ...incompleteData } = updateData;
    const response = await request(app)
      .put(`/api/control/productos-venta/${productId}`)
      .set('Authorization', 'Bearer test-admin-token')
      .send(incompleteData);
      
    expect(response.statusCode).toBe(400);
  });

  it('should return 200 OK and recalculate basePrice on successful update', async () => {
    const response = await request(app)
      .put(`/api/control/productos-venta/${productId}`)
      .set('Authorization', 'Bearer test-admin-token')
      .send(updateData);

    expect(response.statusCode).toBe(200);
    
    const expectedBasePrice = 35.00 / 1.16;
    expect(admin.__mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ...updateData,
        basePrice: expect.closeTo(expectedBasePrice),
      })
    );

    expect(response.body.basePrice).toBeCloseTo(expectedBasePrice);
  });
});

describe('GET /api/control/productos-venta/:id', () => {
  const productId = 'test-product-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .get(`/api/control/productos-venta/${productId}`)
      .set('Authorization', 'Bearer test-regular-user-token');
    
    expect(response.statusCode).toBe(403);
  });

  it('should return 404 Not Found if the product does not exist', async () => {
    admin.__mockGet.mockResolvedValueOnce({ exists: false });
    const response = await request(app)
      .get(`/api/control/productos-venta/${productId}`)
      .set('Authorization', 'Bearer test-admin-token');
      
    expect(response.statusCode).toBe(404);
  });

  it('should return 200 OK and the product data on success', async () => {
    admin.__mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ name: 'Test Product' }),
      id: productId, // Include id in the mock snapshot
    });

    const response = await request(app)
      .get(`/api/control/productos-venta/${productId}`)
      .set('Authorization', 'Bearer test-admin-token');

    expect(response.statusCode).toBe(200);
    expect(admin.__mockGet).toHaveBeenCalled();
    // The backend combines doc.id and doc.data(), so we check the final object
    expect(response.body).toEqual(expect.objectContaining({
      id: productId,
      name: 'Test Product',
    }));
  });
});
