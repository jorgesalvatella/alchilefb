const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de firebase-admin y authMiddleware
jest.mock('firebase-admin', () => {
  const mockDocGet = jest.fn();
  const firestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockDocGet,
      })),
    })),
  };
  return {
    initializeApp: jest.fn(),
    firestore: () => firestore,
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
    }),
    mockDocGet,
  };
});

jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  req.user = { uid: 'test-uid' };
  next();
}));


describe('POST /api/cart/verify-totals', () => {
  const mockDocGet = admin.mockDocGet;

  const mockProduct1 = {
    name: 'Taco de Pastor',
    price: 25.00,
    basePrice: 21.55,
    isTaxable: true,
    ingredientesExtra: [
      { nombre: 'Queso', precio: 10.00 },
      { nombre: 'Aguacate', precio: 15.00 },
    ],
  };

  const mockProduct2 = {
    name: 'Agua de Horchata',
    price: 30.00,
    basePrice: 30.00,
    isTaxable: false,
  };

  beforeEach(() => {
    mockDocGet.mockClear();
  });

  it('should calculate totals for a simple cart without customizations', async () => {
    const items = [
      { productId: 'prod1', quantity: 2, customizations: { added: [], removed: [] } },
    ];
    mockDocGet.mockResolvedValue({ exists: true, data: () => mockProduct1 });

    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalFinal).toBeCloseTo(50.00);
    expect(res.body.summary.subtotalGeneral).toBeCloseTo(43.10);
  });

  it('should calculate totals correctly with added extras', async () => {
    const items = [
      { 
        productId: 'prod1', 
        quantity: 1, 
        customizations: { added: ['Queso'], removed: ['Cebolla'] } 
      },
    ];
    mockDocGet.mockResolvedValue({ exists: true, data: () => mockProduct1 });

    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalFinal).toBeCloseTo(35.00);
    expect(res.body.summary.subtotalGeneral).toBeCloseTo(21.55 + (10 / 1.16));
    expect(res.body.items[0].name).toContain('(+ Queso)');
    expect(res.body.items[0].removed).toContain('Cebolla');
  });

  it('should ignore non-existent extras and calculate total correctly', async () => {
    const items = [
      { 
        productId: 'prod1', 
        quantity: 1, 
        customizations: { added: ['Piña'], removed: [] }
      },
    ];
    mockDocGet.mockResolvedValue({ exists: true, data: () => mockProduct1 });

    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalFinal).toBeCloseTo(25.00);
  });

  it('should handle multiple items with and without customizations', async () => {
    const items = [
      { 
        productId: 'prod1', 
        quantity: 2, 
        customizations: { added: ['Aguacate'], removed: [] } 
      },
      {
        productId: 'prod2',
        quantity: 3,
        customizations: { added: [], removed: [] }
      }
    ];
    mockDocGet
      .mockResolvedValueOnce({ exists: true, data: () => mockProduct1 })
      .mockResolvedValueOnce({ exists: true, data: () => mockProduct2 });

    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalFinal).toBeCloseTo(170.00);
  });

  it('should return 400 if items array is missing', async () => {
    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid item structure', async () => {
    const items = [{ quantity: 1 }];
    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 if a product is not found', async () => {
    const items = [{ productId: 'prod-non-existent', quantity: 1, customizations: {added: [], removed: []} }];
    mockDocGet.mockResolvedValue({ exists: false });
    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });
    expect(res.statusCode).toBe(400);
  });
});
