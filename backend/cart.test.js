const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock dinámico y robusto de firebase-admin
jest.mock('firebase-admin', () => {
  const mockDb = {
    'prod1': {
      name: 'Taco de Pastor',
      price: 25.00,
      basePrice: 21.5517, // 25 / 1.16
      isTaxable: true,
      ingredientesExtra: [
        { nombre: 'Queso', precio: 10.00 },
        { nombre: 'Aguacate', precio: 15.00 },
      ],
    },
    'prod2': {
      name: 'Agua de Horchata',
      price: 30.00,
      basePrice: 30.00,
      isTaxable: false,
    },
  };

  const mockDocGet = jest.fn((docId) => {
    const doc = mockDb[docId];
    return Promise.resolve({
      exists: !!doc,
      data: () => doc,
    });
  });

  // Mock de query builder para soportar .where().get()
  const createQueryMock = () => {
    const queryMock = {
      where: jest.fn(() => queryMock),
      orderBy: jest.fn(() => queryMock),
      limit: jest.fn(() => queryMock),
      get: jest.fn(() => Promise.resolve({
        empty: true,
        docs: [],
        forEach: (callback) => {}
      }))
    };
    return queryMock;
  };

  const firestore = () => ({
    collection: (collectionName) => {
      if (collectionName === 'productosDeVenta') {
        return {
          doc: (docId) => ({
            get: () => mockDocGet(docId),
          }),
        };
      }
      // Para otras colecciones (como 'promotions'), retornar query mock
      return {
        ...createQueryMock(),
        doc: (docId) => ({
          get: () => Promise.resolve({ exists: false })
        })
      };
    },
  });

  return {
    initializeApp: jest.fn(),
    firestore,
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
    }),
  };
});

jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  req.user = { uid: 'test-uid' };
  next();
}));


describe('POST /api/cart/verify-totals', () => {
  beforeEach(() => {
    // jest.clearAllMocks() se ejecuta automáticamente por la configuración de Jest
  });

  it('should calculate totals for a simple cart without customizations', async () => {
    const items = [
      { productId: 'prod1', quantity: 2, customizations: { added: [], removed: [] } },
    ];
    
    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalFinal).toBeCloseTo(50.00);
    expect(res.body.summary.subtotalGeneral).toBeCloseTo(43.10, 2);
  });

  it('should calculate totals correctly with added extras', async () => {
    const items = [
      { 
        productId: 'prod1', 
        quantity: 1, 
        customizations: { added: ['Queso'], removed: ['Cebolla'] } 
      },
    ];

    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalFinal).toBeCloseTo(35.00); // 25 (base) + 10 (queso)
    expect(res.body.summary.subtotalGeneral).toBeCloseTo(21.5517 + (10 / 1.16));
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

    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });

    // prod1: (25 + 15) * 2 = 80
    // prod2: 30 * 3 = 90
    // Total: 170
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
    const items = [{ quantity: 1 }]; // Falta productId
    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 if a product is not found', async () => {
    const items = [{ productId: 'prod-non-existent', quantity: 1, customizations: {added: [], removed: []} }];
    const res = await request(app)
      .post('/api/cart/verify-totals')
      .set('Authorization', 'Bearer test-token')
      .send({ items });
    expect(res.statusCode).toBe(400);
  });
});
