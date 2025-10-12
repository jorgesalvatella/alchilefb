const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de firebase-admin
jest.mock('firebase-admin', () => {
  const mockDocGet = jest.fn();

  const firestore = {
    collection: jest.fn(() => ({
      doc: jest.fn((docId) => ({
        get: mockDocGet,
      })),
    })),
  };

  return {
    initializeApp: jest.fn(),
    firestore: () => firestore,
    mockDocGet, // Expose mock for easy access in tests
  };
});

describe('POST /api/cart/verify-totals', () => {
  const mockDocGet = admin.mockDocGet;

  beforeEach(() => {
    mockDocGet.mockClear();
  });

  it('should calculate totals correctly with valid items', async () => {
    const items = [
      { id: 'prod1', quantity: 2 }, // Price 10
      { id: 'prod2', quantity: 1 }, // Price 20
    ];

    mockDocGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ price: 10 }) })
      .mockResolvedValueOnce({ exists: true, data: () => ({ price: 20 }) });

    const res = await request(app).post('/api/cart/verify-totals').send({ items });

    expect(res.statusCode).toBe(200);
    const total = 10 * 2 + 20 * 1;
    const subtotal = total / 1.16;
    const tax = total - subtotal;

    expect(res.body.total).toBeCloseTo(total);
    expect(res.body.subtotal).toBeCloseTo(subtotal);
    expect(res.body.tax).toBeCloseTo(tax);
  });

  it('should return 400 if items array is missing', async () => {
    const res = await request(app).post('/api/cart/verify-totals').send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid item structure', async () => {
    const items = [{ id: 'prod1' }]; // Missing quantity
    const res = await request(app).post('/api/cart/verify-totals').send({ items });
    expect(res.statusCode).toBe(400);
  });

  it('should return 404 if a product is not found', async () => {
    const items = [{ id: 'prod1', quantity: 1 }];
    mockDocGet.mockResolvedValue({ exists: false });
    const res = await request(app).post('/api/cart/verify-totals').send({ items });
    expect(res.statusCode).toBe(404);
  });
});
