const request = require('supertest');
const app = require('./app');

// Mock de firebase-admin con funcionalidad completa
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockAdd = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockTransactionGet = jest.fn();
const mockSnapshot = {
  empty: false,
  size: 0,
  docs: [],
  forEach: jest.fn(),
};

jest.mock('firebase-admin', () => {
  const mockCollection = jest.fn(() => ({
    doc: jest.fn((docId) => ({
      get: mockGet,
      update: mockUpdate,
      id: docId,
    })),
    add: mockAdd,
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    get: jest.fn(() => Promise.resolve(mockSnapshot)),
  }));

  const firestore = jest.fn(() => ({
    collection: mockCollection,
    runTransaction: jest.fn(async (updateFunction) => {
      const transaction = {
        get: mockTransactionGet,
        update: mockTransactionUpdate,
      };
      return await updateFunction(transaction);
    }),
  }));

  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
    arrayUnion: jest.fn((val) => ({ _methodName: 'arrayUnion', _elements: val })),
  };

  firestore.Timestamp = {
    fromDate: jest.fn((date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
      _seconds: Math.floor(date.getTime() / 1000),
    })),
  };

  return {
    initializeApp: jest.fn(),
    firestore,
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'test-admin-uid',
        admin: true,
      }),
      getUser: jest.fn().mockResolvedValue({
        uid: 'test-admin-uid',
        customClaims: { admin: true },
      }),
    }),
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  req.user = {
    uid: 'test-admin-uid',
    admin: true,
    super_admin: false,
  };
  next();
}));

describe('Orders Hub Backend Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshot.empty = false;
    mockSnapshot.size = 0;
    mockSnapshot.docs = [];
    mockSnapshot.forEach = jest.fn();
    mockTransactionGet.mockClear();
    mockTransactionUpdate.mockClear();
  });

  describe('GET /api/pedidos/control', () => {
    it('should return empty list when no orders exist', async () => {
      mockSnapshot.empty = true;
      mockSnapshot.docs = [];

      const res = await request(app)
        .get('/api/pedidos/control')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body.orders).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should return list of orders successfully', async () => {
      const mockOrders = [
        {
          id: 'order1',
          data: () => ({
            userId: 'user1',
            status: 'Preparando',
            totalVerified: 100,
            createdAt: { toDate: () => new Date('2025-10-13T10:00:00Z') },
            userName: 'Juan Pérez',
            userEmail: 'juan@example.com',
            items: [],
          }),
        },
        {
          id: 'order2',
          data: () => ({
            userId: 'user2',
            status: 'En Reparto',
            totalVerified: 200,
            createdAt: { toDate: () => new Date('2025-10-13T11:00:00Z') },
            userName: 'María García',
            userEmail: 'maria@example.com',
            items: [],
          }),
        },
      ];

      mockSnapshot.empty = false;
      mockSnapshot.docs = mockOrders;

      const res = await request(app)
        .get('/api/pedidos/control')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body.orders).toHaveLength(2);
      expect(res.body.orders[0].id).toBe('order1');
      expect(res.body.orders[0].userName).toBe('Juan Pérez');
    });

    it('should return 403 if user is not admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false };
        next();
      });

      const res = await request(app)
        .get('/api/pedidos/control')
        .set('Authorization', 'Bearer regular-token');

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  describe('GET /api/pedidos/control/stats', () => {
    it('should return KPIs successfully', async () => {
      const now = new Date();
      const mockOrders = [
        {
          data: () => ({
            status: 'Preparando',
            totalVerified: 100,
            createdAt: { toMillis: () => now.getTime() - 3600000 },
            deliveredAt: null,
          }),
        },
        {
          data: () => ({
            status: 'En Reparto',
            totalVerified: 150,
            createdAt: { toMillis: () => now.getTime() - 1800000 },
            deliveredAt: null,
          }),
        },
        {
          data: () => ({
            status: 'Entregado',
            totalVerified: 200,
            createdAt: { toMillis: () => now.getTime() - 7200000 },
            deliveredAt: { toMillis: () => now.getTime() - 3600000 },
          }),
        },
      ];

      mockSnapshot.size = 3;
      mockSnapshot.docs = mockOrders;
      mockSnapshot.forEach = jest.fn((callback) => {
        mockOrders.forEach((doc) => callback(doc));
      });

      const res = await request(app)
        .get('/api/pedidos/control/stats')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('todayOrders');
      expect(res.body).toHaveProperty('activeOrders');
      expect(res.body).toHaveProperty('todayRevenue');
      expect(res.body).toHaveProperty('averageDeliveryTime');
      expect(res.body.todayOrders).toBe(3);
      expect(res.body.activeOrders).toBe(2);
      expect(res.body.todayRevenue).toBe(450);
    });

    it('should return 403 if user is not admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false };
        next();
      });

      const res = await request(app)
        .get('/api/pedidos/control/stats')
        .set('Authorization', 'Bearer regular-token');

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/pedidos/control/:orderId/status', () => {
    it('should update order status successfully', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'Preparando',
          userId: 'user1',
        }),
      });

      mockUpdate.mockResolvedValue({});
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'Preparando',
          userId: 'user1',
        }),
      }).mockResolvedValueOnce({
        id: 'order123',
        data: () => ({
          status: 'En Reparto',
          userId: 'user1',
        }),
      });

      const res = await request(app)
        .put('/api/pedidos/control/order123/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'En Reparto' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('actualizado');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should add deliveredAt when status changes to Entregado', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'En Reparto',
          userId: 'user1',
        }),
      });

      mockUpdate.mockResolvedValue({});

      const res = await request(app)
        .put('/api/pedidos/control/order123/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Entregado' });

      expect(res.statusCode).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Entregado',
        })
      );
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .put('/api/pedidos/control/order123/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Invalid Status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Estado inválido');
    });

    it('should return 404 if order does not exist', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const res = await request(app)
        .put('/api/pedidos/control/order999/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Preparando' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('no encontrado');
    });

    it('should return 403 if user is not admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false };
        next();
      });

      const res = await request(app)
        .put('/api/pedidos/control/order123/status')
        .set('Authorization', 'Bearer regular-token')
        .send({ status: 'Preparando' });

      expect(res.statusCode).toBe(403);
    });

    it('should set driver to available if it was their last delivery', async () => {
      // Mock the order being delivered
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'En Reparto',
          userId: 'user1',
          driverId: 'driver123',
        }),
      });
      mockUpdate.mockResolvedValue({});

      // Mock the check for other orders: return an empty snapshot
      mockSnapshot.empty = true;

      const res = await request(app)
        .put('/api/pedidos/control/order123/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Entregado' });

      expect(res.statusCode).toBe(200);
      // The first update is for the order, the second for the driver
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'available',
        currentOrderId: null,
      });
    });

    it('should NOT set driver to available if they have other deliveries', async () => {
      // Mock the order being delivered
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'En Reparto',
          userId: 'user1',
          driverId: 'driver123',
        }),
      });
      mockUpdate.mockResolvedValue({});

      // Mock the check for other orders: return a non-empty snapshot
      mockSnapshot.empty = false;
      mockSnapshot.docs = [{ id: 'otherOrder', data: () => ({}) }];

      const res = await request(app)
        .put('/api/pedidos/control/order123/status')
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'Entregado' });

      expect(res.statusCode).toBe(200);
      // Only the order should be updated. The driver update should not be called.
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/pedidos/control/:orderId', () => {
    it('should return order details successfully', async () => {
      const mockOrder = {
        userId: 'user1',
        status: 'Preparando',
        totalVerified: 250,
        createdAt: { toDate: () => new Date() },
        items: [
          { id: 'prod1', name: 'Taco', price: 10, quantity: 2 },
        ],
        shippingAddress: {
          street: 'Calle 123',
          city: 'Santiago',
        },
        paymentMethod: 'Efectivo',
        userName: 'Juan Pérez',
        userEmail: 'juan@example.com',
        statusHistory: [
          {
            status: 'Pedido Realizado',
            timestamp: { toDate: () => new Date() },
          },
        ],
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'order123',
        data: () => mockOrder,
      });

      const res = await request(app)
        .get('/api/pedidos/control/order123')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(200);
      expect(res.body.order).toHaveProperty('userId', 'user1');
      expect(res.body.order).toHaveProperty('status', 'Preparando');
      expect(res.body.order).toHaveProperty('userName', 'Juan Pérez');
    });

    it('should return 404 if order does not exist', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const res = await request(app)
        .get('/api/pedidos/control/order999')
        .set('Authorization', 'Bearer admin-token');

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('no encontrado');
    });

    it('should return 403 if user is not admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false };
        next();
      });

      const res = await request(app)
        .get('/api/pedidos/control/order123')
        .set('Authorization', 'Bearer regular-token');

      expect(res.statusCode).toBe(403);
    });
  });

  describe('DELETE /api/pedidos/control/:orderId/cancel', () => {
    it('should cancel order successfully', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'Preparando',
          userId: 'user1',
        }),
      }).mockResolvedValueOnce({
        id: 'order123',
        data: () => ({
          status: 'Cancelado',
          userId: 'user1',
          cancelReason: 'Cliente solicitó cancelación',
        }),
      });

      mockUpdate.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/pedidos/control/order123/cancel')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Cliente solicitó cancelación' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('cancelado');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Cancelado',
          cancelReason: 'Cliente solicitó cancelación',
        })
      );
    });

    it('should return 400 if trying to cancel delivered order', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'Entregado',
          userId: 'user1',
        }),
      });

      const res = await request(app)
        .delete('/api/pedidos/control/order123/cancel')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Intento de cancelación' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('entregado');
    });

    it('should return 400 if reason is missing', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'Preparando',
          userId: 'user1',
        }),
      });

      const res = await request(app)
        .delete('/api/pedidos/control/order123/cancel')
        .set('Authorization', 'Bearer admin-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('proporcionar una razón');
    });

    it('should return 404 if order does not exist', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const res = await request(app)
        .delete('/api/pedidos/control/order999/cancel')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Cancelación' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('no encontrado');
    });

    it('should return 403 if user is not admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false };
        next();
      });

      const res = await request(app)
        .delete('/api/pedidos/control/order123/cancel')
        .set('Authorization', 'Bearer regular-token')
        .send({ reason: 'Cancelación' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/pedidos/control/:orderId/asignar-repartidor', () => {
    // NOTA: Este endpoint debe usar la colección 'repartidores' (no 'drivers')
    // para mantener consistencia con GET /api/control/drivers
    const mockOrder = {
      status: 'Preparando',
      userId: 'user1',
    };
    const mockDriver = {
      name: 'Pedro Picapiedra',
      phone: '987654321',
      status: 'available',
    };

    beforeEach(() => {
      mockTransactionGet.mockClear();
      mockTransactionUpdate.mockClear();
    });

    it('should assign a driver successfully', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({ exists: true, data: () => mockOrder }) // First get is order
        .mockResolvedValueOnce({ exists: true, data: () => mockDriver }); // Second get is driver

      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 'driver456' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('exitosamente');
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);

      // Check order update
      expect(mockTransactionUpdate).toHaveBeenCalledWith(expect.anything(), {
        status: 'En Reparto',
        driverId: 'driver456',
        driverName: 'Pedro Picapiedra',
        driverPhone: '987654321',
        statusHistory: expect.any(Object),
      });

      // Check driver update
      expect(mockTransactionUpdate).toHaveBeenCalledWith(expect.anything(), {
        status: 'busy',
        currentOrderId: 'order123',
      });
    });

    it('should return 404 if order does not exist', async () => {
      mockTransactionGet.mockResolvedValueOnce({ exists: false });

      const res = await request(app)
        .put('/api/pedidos/control/order999/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 'driver456' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Pedido no encontrado');
    });

    it('should return 404 if driver does not exist', async () => {
      mockTransactionGet
        .mockResolvedValueOnce({ exists: true, data: () => mockOrder })
        .mockResolvedValueOnce({ exists: false });

      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 'driver999' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Repartidor no encontrado');
    });

    it('should assign a busy driver successfully', async () => {
      const busyDriver = { ...mockDriver, status: 'busy' };
      mockTransactionGet
        .mockResolvedValueOnce({ exists: true, data: () => mockOrder })
        .mockResolvedValueOnce({ exists: true, data: () => busyDriver });

      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 'driver456' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('exitosamente');
      expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);
    });

    it('should return 404 if driver is soft deleted', async () => {
      const deletedDriver = { ...mockDriver, deleted: true };
      mockTransactionGet
        .mockResolvedValueOnce({ exists: true, data: () => mockOrder })
        .mockResolvedValueOnce({ exists: true, data: () => deletedDriver });

      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 'driver456' });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Repartidor no encontrado');
    });

    it('should return 400 if order is in a non-assignable state', async () => {
      const deliveredOrder = { ...mockOrder, status: 'Entregado' };
      mockTransactionGet
        .mockResolvedValueOnce({ exists: true, data: () => deliveredOrder })
        .mockResolvedValueOnce({ exists: true, data: () => mockDriver });

      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 'driver456' });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Solo se pueden asignar repartidores a pedidos en estado');
    });

    it('should return 400 if driverId is missing', async () => {
      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer admin-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Falta el campo requerido: driverId');
    });
    
    it('should return 403 if user is not an admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false, super_admin: false };
        next();
      });

      const res = await request(app)
        .put('/api/pedidos/control/order123/asignar-repartidor')
        .set('Authorization', 'Bearer regular-token')
        .send({ driverId: 'driver456' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/control/drivers', () => {
    const newDriverData = {
      name: 'Nuevo Repartidor',
      phone: '123456789',
      vehicle: 'Moto XYZ',
      userId: 'new-driver-user-id', // Add userId
    };

    it('should create a driver successfully', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'driver-new' });

      const res = await request(app)
        .post('/api/control/drivers')
        .set('Authorization', 'Bearer admin-token')
        .send(newDriverData);

      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBe('driver-new');
      expect(res.body.name).toBe(newDriverData.name);
      expect(res.body.status).toBe('available');
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        name: newDriverData.name,
        phone: newDriverData.phone,
        vehicle: newDriverData.vehicle,
        userId: newDriverData.userId, // Add userId
        status: 'available',
      }));
    });

    it('should return 400 if name is missing', async () => {
      const { name, ...invalidData } = newDriverData;
      const res = await request(app)
        .post('/api/control/drivers')
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Los campos "name" y "userId" son requeridos.');
    });

    it('should return 403 if user is not an admin', async () => {
      const authMiddleware = require('./authMiddleware');
      authMiddleware.mockImplementationOnce((req, res, next) => {
        req.user = { uid: 'regular-user', admin: false, super_admin: false };
        next();
      });

      const res = await request(app)
        .post('/api/control/drivers')
        .set('Authorization', 'Bearer regular-token')
        .send(newDriverData);

      expect(res.statusCode).toBe(403);
    });
  });
});