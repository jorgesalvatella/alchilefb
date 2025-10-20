const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock completo de firebase-admin
jest.mock('firebase-admin', () => {
  const mockRepartidores = {
    'repartidor123': {
      name: 'Juan Pérez',
      phone: '555-1234',
      email: 'juan@test.com',
      status: 'disponible',
      assignedOrderCount: 2,
      userId: 'test-repartidor-uid',
      vehicleType: 'moto',
      deleted: false
    },
    'repartidor456': {
      name: 'María López',
      phone: '555-5678',
      status: 'ocupado',
      assignedOrderCount: 3,
      userId: 'other-repartidor-uid',
      deleted: false
    }
  };

  const mockOrders = {
    'order123': {
      driverId: 'repartidor123',
      status: 'Preparando',
      userId: 'customer1',
      items: [{ name: 'Albóndigas', quantity: 2, price: 150 }],
      totalVerified: 300,
      shippingAddress: { street: 'Calle 123', city: 'Ciudad' },
      createdAt: { toDate: () => new Date() }
    },
    'order456': {
      driverId: 'repartidor123',
      status: 'En Reparto',
      userId: 'customer2',
      items: [{ name: 'Bebida', quantity: 1, price: 50 }],
      totalVerified: 50,
      shippingAddress: { street: 'Av 456', city: 'Ciudad' },
      createdAt: { toDate: () => new Date() }
    },
    'order789': {
      driverId: 'repartidor456',
      status: 'Preparando',
      userId: 'customer3',
      items: [],
      totalVerified: 100,
      createdAt: { toDate: () => new Date() }
    }
  };

  const mockDocGet = jest.fn((docId) => {
    const order = mockOrders[docId];
    return Promise.resolve({
      exists: !!order,
      data: () => order,
    });
  });

  const mockUpdate = jest.fn();
  const mockAdd = jest.fn();
  const mockWhere = jest.fn();
  const mockLimit = jest.fn();
  const mockOrderBy = jest.fn();
  const mockGetEmpty = jest.fn(() => false);
  const mockDocs = jest.fn();

  // Setup de query para repartidores
  mockWhere.mockImplementation(function(field, op, value) {
    this._whereConditions = this._whereConditions || [];
    this._whereConditions.push({ field, op, value });
    return this;
  });

  mockLimit.mockImplementation(function(num) {
    this._limit = num;
    return this;
  });

  mockOrderBy.mockImplementation(function(field, direction) {
    this._orderBy = { field, direction };
    return this;
  });

  const createMockGet = (collectionName) => {
    return jest.fn(async function() {
      const conditions = this._whereConditions || [];

      if (collectionName === 'repartidores') {
        // Buscar repartidor por userId
        const userIdCondition = conditions.find(c => c.field === 'userId');
        if (userIdCondition) {
          const repartidor = Object.entries(mockRepartidores).find(
            ([id, data]) => data.userId === userIdCondition.value && !data.deleted
          );

          if (repartidor) {
            return {
              empty: false,
              docs: [{
                id: repartidor[0],
                data: () => repartidor[1],
                ref: {
                  update: mockUpdate
                }
              }]
            };
          }
        }

        return { empty: true, docs: [] };
      }

      if (collectionName === 'orders') {
        // Filtrar pedidos por driverId
        const driverIdCondition = conditions.find(c => c.field === 'driverId');
        const statusCondition = conditions.find(c => c.field === 'status');

        let filteredOrders = Object.entries(mockOrders);

        if (driverIdCondition) {
          filteredOrders = filteredOrders.filter(([id, order]) =>
            order.driverId === driverIdCondition.value
          );
        }

        if (statusCondition) {
          if (statusCondition.op === 'in') {
            filteredOrders = filteredOrders.filter(([id, order]) =>
              statusCondition.value.includes(order.status)
            );
          } else {
            filteredOrders = filteredOrders.filter(([id, order]) =>
              order.status === statusCondition.value
            );
          }
        }

        return {
          empty: filteredOrders.length === 0,
          docs: filteredOrders.map(([id, order]) => ({
            id,
            data: () => order
          }))
        };
      }

      return { empty: true, docs: [] };
    });
  };

  const firestoreMock = {
    collection: jest.fn((collectionName) => {
      const mockGet = createMockGet(collectionName);

      return {
        where: mockWhere,
        limit: mockLimit,
        orderBy: mockOrderBy,
        get: mockGet,
        doc: (docId) => ({
          get: () => mockDocGet(docId),
          update: mockUpdate,
        }),
        add: mockAdd,
      };
    }),
  };

  // Mock FieldValue
  function MockFieldValue() {}
  MockFieldValue.arrayUnion = jest.fn((value) => ({ _arrayUnion: value }));
  MockFieldValue.serverTimestamp = jest.fn(() => ({ _serverTimestamp: true }));

  const mockTimestamp = {
    now: jest.fn(() => ({
      toDate: () => new Date(),
      _timestamp: true
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
      _timestamp: true
    }))
  };

  const firestoreFunction = () => firestoreMock;
  firestoreFunction.FieldValue = MockFieldValue;
  firestoreFunction.Timestamp = mockTimestamp;

  return {
    initializeApp: jest.fn(),
    firestore: firestoreFunction,
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user-id' }),
    }),
    // Exportar para poder acceder en tests
    __mockDocGet: mockDocGet,
    __mockUpdate: mockUpdate,
    __mockAdd: mockAdd,
    __mockGetEmpty: mockGetEmpty,
    __mockDocs: mockDocs,
    __mockRepartidores: mockRepartidores,
    __mockOrders: mockOrders,
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  // Simular diferentes usuarios según el token
  if (token === 'test-repartidor-token') {
    req.user = { uid: 'test-repartidor-uid', repartidor: true };
  } else if (token === 'test-regular-user-token') {
    req.user = { uid: 'test-regular-uid' };
  } else if (token === 'other-repartidor-token') {
    req.user = { uid: 'other-repartidor-uid', repartidor: true };
  }

  next();
}));

describe('GET /api/repartidores/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 for non-repartidor user', async () => {
    const res = await request(app)
      .get('/api/repartidores/me')
      .set('Authorization', 'Bearer test-regular-user-token');

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('repartidor');
  });

  it('should return 404 if repartidor document not found', async () => {
    // Usuario con claim repartidor pero sin documento en Firestore
    // Necesitamos agregar este token al mock del authMiddleware
    const authMock = require('./authMiddleware');
    authMock.mockImplementationOnce((req, res, next) => {
      req.user = { uid: 'missing-repartidor-uid', repartidor: true };
      next();
    });

    const res = await request(app)
      .get('/api/repartidores/me')
      .set('Authorization', 'Bearer test-missing-repartidor-token');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('no encontrado');
  });

  it('should return repartidor data for valid token', async () => {
    const res = await request(app)
      .get('/api/repartidores/me')
      .set('Authorization', 'Bearer test-repartidor-token');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'Juan Pérez');
    expect(res.body).toHaveProperty('status', 'disponible');
    expect(res.body).toHaveProperty('phone', '555-1234');
    expect(res.body).toHaveProperty('assignedOrderCount', 2);
    // No debe incluir campos sensibles
    expect(res.body).not.toHaveProperty('deleted');
  });
});

describe('GET /api/repartidores/me/pedidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 for non-repartidor user', async () => {
    const res = await request(app)
      .get('/api/repartidores/me/pedidos')
      .set('Authorization', 'Bearer test-regular-user-token');

    expect(res.statusCode).toBe(403);
  });

  it('should return only assigned orders for repartidor', async () => {
    const res = await request(app)
      .get('/api/repartidores/me/pedidos')
      .set('Authorization', 'Bearer test-repartidor-token');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('pedidos');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.pedidos)).toBe(true);

    // Verificar que solo retorna pedidos del repartidor correcto
    res.body.pedidos.forEach(pedido => {
      expect(pedido.driverId).toBe('repartidor123');
    });
  });

  it('should filter orders by status when provided', async () => {
    const res = await request(app)
      .get('/api/repartidores/me/pedidos?status=Preparando')
      .set('Authorization', 'Bearer test-repartidor-token');

    expect(res.statusCode).toBe(200);
    res.body.pedidos.forEach(pedido => {
      expect(pedido.status).toBe('Preparando');
    });
  });
});

describe('PUT /api/pedidos/:orderId/marcar-en-camino', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 for non-repartidor user', async () => {
    const res = await request(app)
      .put('/api/pedidos/order123/marcar-en-camino')
      .set('Authorization', 'Bearer test-regular-user-token')
      .send({});

    expect(res.statusCode).toBe(403);
  });

  it('should return 404 if order not found', async () => {
    admin.__mockDocGet.mockResolvedValueOnce({
      exists: false
    });

    const res = await request(app)
      .put('/api/pedidos/nonexistent/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({});

    expect(res.statusCode).toBe(404);
  });

  it('should return 403 if order not assigned to this driver', async () => {
    const res = await request(app)
      .put('/api/pedidos/order789/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({});

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('no está asignado');
  });

  it('should update order status to En Reparto', async () => {
    const res = await request(app)
      .put('/api/pedidos/order123/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({ currentLocation: { lat: 19.4326, lng: -99.1332 } });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe('En Reparto');
    expect(admin.__mockUpdate).toHaveBeenCalled();
  });

  it('should return 400 if status transition is invalid', async () => {
    // Pedido ya en reparto, no se puede marcar en camino de nuevo
    const res = await request(app)
      .put('/api/pedidos/order456/marcar-en-camino')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('No se puede marcar en camino');
  });
});

describe('PUT /api/pedidos/:orderId/marcar-entregado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 for non-repartidor user', async () => {
    const res = await request(app)
      .put('/api/pedidos/order456/marcar-entregado')
      .set('Authorization', 'Bearer test-regular-user-token')
      .send({});

    expect(res.statusCode).toBe(403);
  });

  it('should update order and driver status when delivered', async () => {
    const res = await request(app)
      .put('/api/pedidos/order456/marcar-entregado')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({ deliveryNotes: 'Todo bien' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.order.status).toBe('Entregado');
    expect(res.body.driverStatusUpdated).toBe(true);

    // Verificar que se llamó update tanto para order como para repartidor
    expect(admin.__mockUpdate).toHaveBeenCalledTimes(2);
  });

  it('should return 400 if order is not En Reparto', async () => {
    const res = await request(app)
      .put('/api/pedidos/order123/marcar-entregado')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('No se puede marcar entregado');
  });

  it('should accept optional signature parameter', async () => {
    const res = await request(app)
      .put('/api/pedidos/order456/marcar-entregado')
      .set('Authorization', 'Bearer test-repartidor-token')
      .send({
        deliveryNotes: 'Entregado correctamente',
        signature: 'data:image/png;base64,abc123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
