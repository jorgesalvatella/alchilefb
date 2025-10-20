const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');
const authMiddleware = require('./authMiddleware');

// Mock dinámico y robusto de firebase-admin
jest.mock('firebase-admin', () => {
  const mockFileExists = jest.fn();
  const mockGetSignedUrl = jest.fn();
  const mockGetMetadata = jest.fn();
  const mockSetMetadata = jest.fn();

  const mockFileMethods = {
    exists: mockFileExists,
    getSignedUrl: mockGetSignedUrl,
    getMetadata: mockGetMetadata,
    setMetadata: mockSetMetadata,
  };

  const mockBucket = {
    file: jest.fn(() => mockFileMethods),
    name: 'test-bucket',
  };

  const storageMock = {
    bucket: jest.fn(() => mockBucket),
  };
  
  const firestoreMock = {
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [], forEach: () => {} }),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    doc: jest.fn().mockReturnThis(),
    update: jest.fn().mockResolvedValue(),
  };

  // Exponer funciones internas del mock de Firestore para controlarlas en las pruebas
  firestoreMock.__mockGet = firestoreMock.get;
  firestoreMock.__mockAdd = firestoreMock.add;
  firestoreMock.__mockUpdate = firestoreMock.update;


  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    storage: () => storageMock,
    auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' }) }),
    app: () => ({ delete: jest.fn() }),
    __mockFileExists: mockFileExists,
    __mockGetSignedUrl: mockGetSignedUrl,
    __mockGetMetadata: mockGetMetadata,
    __mockSetMetadata: mockSetMetadata,
  };
});

// Mock dinámico del middleware de autenticación
jest.mock('./authMiddleware');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configuración por defecto: simula un usuario no autenticado
    authMiddleware.mockImplementation((req, res, next) => {
      // Si una prueba específica no sobreescribe esto, se denegará el acceso.
      return res.status(401).send({ message: 'Unauthorized: Mock missing user.' });
    });
  });

  describe('GET /api/me/orders', () => {
    it('should return 401 Unauthorized for unauthenticated users', async () => {
      const response = await request(app).get('/api/me/orders');
      expect(response.statusCode).toBe(401);
    });

    it('should return 200 OK and an array for authenticated regular users', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { uid: 'test-uid-regular', email: 'user@test.com' };
        next();
      });
      admin.firestore().get.mockResolvedValue({ 
        empty: false,
        docs: [{ id: 'order1', data: () => ({ total: 100 }) }] 
      });
      const response = await request(app).get('/api/me/orders');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/me/orders/:id', () => {
    const orderId = 'test-order-id';

    it('should return 401 for unauthenticated users', async () => {
      const response = await request(app).get(`/api/me/orders/${orderId}`);
      expect(response.statusCode).toBe(401);
    });

    it('should return 404 Not Found if the order belongs to another user', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { uid: 'test-uid-regular' };
        next();
      });
      admin.firestore().get.mockResolvedValue({
        exists: true,
        data: () => ({ userId: 'another-user-id' }),
      });
      const response = await request(app).get(`/api/me/orders/${orderId}`);
      expect(response.statusCode).toBe(404);
    });

    it('should return 200 OK and the order data if the user is the owner', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { uid: 'test-uid-regular' };
        next();
      });
      const mockOrder = { userId: 'test-uid-regular', totalVerified: 100 };
      admin.firestore().get.mockResolvedValue({
        exists: true,
        data: () => mockOrder,
      });
      const response = await request(app).get(`/api/me/orders/${orderId}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual(expect.objectContaining(mockOrder));
    });
  });

  describe('Payment Methods Endpoints', () => {
    describe('GET /api/control/metodos-pago', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).get('/api/control/metodos-pago');
        expect(response.statusCode).toBe(403);
      });

      it('should return 200 OK and payment methods for admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const mockPaymentMethods = [
          { id: 'pm1', name: 'Efectivo', active: true, deleted: false },
          { id: 'pm2', name: 'Tarjeta de Crédito', active: true, deleted: false },
        ];
        admin.firestore().get.mockResolvedValue({
          empty: false,
          forEach: (callback) => mockPaymentMethods.forEach((pm) => callback({ id: pm.id, data: () => pm })),
        });
        const response = await request(app).get('/api/control/metodos-pago');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('POST /api/control/metodos-pago', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app)
          .post('/api/control/metodos-pago')
          .send({ name: 'Transferencia' });
        expect(response.statusCode).toBe(403);
      });

      it('should return 400 Bad Request if name is missing', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const response = await request(app)
          .post('/api/control/metodos-pago')
          .send({});
        expect(response.statusCode).toBe(400);
      });

      it('should return 201 Created for valid admin request', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        admin.firestore().add.mockResolvedValue({ id: 'new-pm-id' });
        const response = await request(app)
          .post('/api/control/metodos-pago')
          .send({ name: 'Transferencia', description: 'Transferencia bancaria', active: true });
        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe('Transferencia');
      });
    });

    describe('PUT /api/control/metodos-pago/:metodoPagoId', () => {
      const metodoPagoId = 'pm-123';

      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app)
          .put(`/api/control/metodos-pago/${metodoPagoId}`)
          .send({ name: 'Efectivo Actualizado' });
        expect(response.statusCode).toBe(403);
      });

      it('should return 400 Bad Request if name is missing', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const response = await request(app)
          .put(`/api/control/metodos-pago/${metodoPagoId}`)
          .send({});
        expect(response.statusCode).toBe(400);
      });

      it('should return 200 OK for valid admin update', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        admin.firestore().update.mockResolvedValue();
        const response = await request(app)
          .put(`/api/control/metodos-pago/${metodoPagoId}`)
          .send({ name: 'Efectivo Actualizado', description: 'Pago en efectivo', active: false });
        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe('Efectivo Actualizado');
      });
    });

    describe('DELETE /api/control/metodos-pago/:metodoPagoId', () => {
      const metodoPagoId = 'pm-123';

      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).delete(`/api/control/metodos-pago/${metodoPagoId}`);
        expect(response.statusCode).toBe(403);
      });

      it('should return 200 OK for valid admin deletion', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        admin.firestore().update.mockResolvedValue();
        const response = await request(app).delete(`/api/control/metodos-pago/${metodoPagoId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('deleted successfully');
      });
    });
  });

  describe('Expenses Endpoints', () => {
    const gastoId = 'test-expense-id';
    const mockExpenseData = {
      businessUnitId: 'bu-1',
      departmentId: 'dept-1',
      groupId: 'group-1',
      conceptId: 'concept-1',
      supplierId: 'supplier-1',
      paymentMethodId: 'pm-1',
      amount: 1000,
      currency: 'MXN',
      expenseDate: '2025-01-15',
      invoiceNumber: 'F-001',
      description: 'Test expense',
      authorizedBy: 'John Doe',
      receiptImageUrl: 'https://example.com/receipt.jpg',
    };

    describe('POST /api/control/gastos/upload-receipt', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).post('/api/control/gastos/upload-receipt');
        expect(response.statusCode).toBe(403);
      });

      it('should return 400 Bad Request when no file is uploaded', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const response = await request(app).post('/api/control/gastos/upload-receipt');
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('No file uploaded');
      });
    });

    describe('GET /api/control/gastos', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).get('/api/control/gastos');
        expect(response.statusCode).toBe(403);
      });

      it('should return 200 OK with expenses for admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        admin.firestore().get.mockResolvedValue({ forEach: jest.fn() });
        const response = await request(app).get('/api/control/gastos');
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter expenses by status when status query param is provided', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        admin.firestore().get.mockResolvedValue({ forEach: jest.fn() });
        const response = await request(app).get('/api/control/gastos?status=pending');
        expect(response.statusCode).toBe(200);
      });
    });

    describe('POST /api/control/gastos', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).post('/api/control/gastos').send(mockExpenseData);
        expect(response.statusCode).toBe(403);
      });

      it('should return 400 Bad Request when required fields are missing', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const response = await request(app).post('/api/control/gastos').send({});
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('required');
      });

      it('should return 200 OK for valid expense creation', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock concept and supplier validation - doc().get()
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ proveedoresIds: ['supplier-1'] }),
          }),
        });
        // Mock expense ID generation query
        admin.firestore().get.mockResolvedValueOnce({ empty: true });
        // Mock expense creation - add()
        admin.firestore().add = jest.fn().mockResolvedValue({ id: 'new-expense-id' });

        const response = await request(app).post('/api/control/gastos').send(mockExpenseData);
        expect(response.statusCode).toBe(201);
        expect(response.body.id).toBeDefined();
        expect(response.body.expenseId).toBeDefined();
      });
    });

    describe('PUT /api/control/gastos/:id', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).put(`/api/control/gastos/${gastoId}`).send(mockExpenseData);
        expect(response.statusCode).toBe(403);
      });

      it('should return 404 Not Found for non-existent expense', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock the doc().get() chain to return non-existent doc
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        });
        const response = await request(app).put(`/api/control/gastos/${gastoId}`).send(mockExpenseData);
        expect(response.statusCode).toBe(404);
      });

      it('should return 200 OK for valid expense update by super_admin', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-super', super_admin: true };
          next();
        });
        // Mock the doc().get() and update() chain
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ status: 'pending', createdBy: 'other-user', expenseId: 'EXP-001' }),
          }),
          update: jest.fn().mockResolvedValue(),
        });
        // Mock concept and supplier validation query
        admin.firestore().get.mockResolvedValue({
          empty: false,
          docs: [{ data: () => ({ proveedoresIds: ['supplier-1'] }) }],
        });

        const response = await request(app).put(`/api/control/gastos/${gastoId}`).send(mockExpenseData);
        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(gastoId);
        expect(response.body.expenseId).toBeDefined();
      });
    });

    describe('DELETE /api/control/gastos/:id', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).delete(`/api/control/gastos/${gastoId}`);
        expect(response.statusCode).toBe(403);
      });

      it('should return 404 Not Found for non-existent expense', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock the doc().get() chain to return non-existent doc
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        });
        const response = await request(app).delete(`/api/control/gastos/${gastoId}`);
        expect(response.statusCode).toBe(404);
      });

      it('should return 200 OK for valid expense soft deletion', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock the doc().get() and update() chain
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: true }),
          update: jest.fn().mockResolvedValue(),
        });
        const response = await request(app).delete(`/api/control/gastos/${gastoId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('deleted');
      });
    });

    describe('POST /api/control/gastos/:id/submit', () => {
      it('should return 403 Forbidden for non-admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-regular' };
          next();
        });
        const response = await request(app).post(`/api/control/gastos/${gastoId}/submit`);
        expect(response.statusCode).toBe(403);
      });

      it('should return 404 Not Found for non-existent expense', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock the doc().get() chain to return non-existent doc
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        });
        const response = await request(app).post(`/api/control/gastos/${gastoId}/submit`);
        expect(response.statusCode).toBe(404);
      });

      it('should return 400 Bad Request when receipt image is missing', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock the doc().get() chain
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ status: 'draft', receiptImageUrl: null }),
          }),
        });

        const response = await request(app).post(`/api/control/gastos/${gastoId}/submit`);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('Receipt image');
      });

      it('should return 200 OK for valid submission', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        // Mock the doc().get() and update() chain
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ status: 'draft', receiptImageUrl: 'https://example.com/receipt.jpg' }),
          }),
          update: jest.fn().mockResolvedValue(),
        });

        const response = await request(app).post(`/api/control/gastos/${gastoId}/submit`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('submitted');
      });
    });

    describe('POST /api/control/gastos/:id/approve', () => {
      it('should return 403 Forbidden for non-super_admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const response = await request(app).post(`/api/control/gastos/${gastoId}/approve`);
        expect(response.statusCode).toBe(403);
      });

      it('should return 404 Not Found for non-existent expense', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-super', super_admin: true };
          next();
        });
        // Mock the doc().get() chain to return non-existent doc
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        });
        const response = await request(app).post(`/api/control/gastos/${gastoId}/approve`);
        expect(response.statusCode).toBe(404);
      });

      it('should return 200 OK for valid approval by super_admin', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-super', super_admin: true };
          next();
        });
        // Mock the doc().get() and update() chain
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ status: 'pending' }),
          }),
          update: jest.fn().mockResolvedValue(),
        });

        const response = await request(app).post(`/api/control/gastos/${gastoId}/approve`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('approved');
      });
    });

    describe('POST /api/control/gastos/:id/reject', () => {
      it('should return 403 Forbidden for non-super_admin users', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-admin', admin: true };
          next();
        });
        const response = await request(app)
          .post(`/api/control/gastos/${gastoId}/reject`)
          .send({ rejectionReason: 'Test reason' });
        expect(response.statusCode).toBe(403);
      });

      it('should return 400 Bad Request when rejection reason is missing', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-super', super_admin: true };
          next();
        });
        const response = await request(app).post(`/api/control/gastos/${gastoId}/reject`).send({});
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toContain('Rejection reason');
      });

      it('should return 404 Not Found for non-existent expense', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-super', super_admin: true };
          next();
        });
        // Mock the doc().get() chain to return non-existent doc
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: false }),
        });
        const response = await request(app)
          .post(`/api/control/gastos/${gastoId}/reject`)
          .send({ rejectionReason: 'Test reason' });
        expect(response.statusCode).toBe(404);
      });

      it('should return 200 OK for valid rejection by super_admin', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { uid: 'test-uid-super', super_admin: true };
          next();
        });
        // Mock the doc().get() and update() chain
        admin.firestore().doc = jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ status: 'pending' }),
          }),
          update: jest.fn().mockResolvedValue(),
        });

        const response = await request(app)
          .post(`/api/control/gastos/${gastoId}/reject`)
          .send({ rejectionReason: 'Incomplete documentation' });
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('rejected');
      });
    });
  });
});
