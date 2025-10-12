const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de Firebase Admin - Configuración completa y robusta
jest.mock('firebase-admin', () => {
  const mockAdd = jest.fn(() => Promise.resolve({ id: 'new-doc-id' }));
  const mockArrayUnion = jest.fn();
  const mockArrayRemove = jest.fn();
  const mockUpdate = jest.fn();
  const mockFileExists = jest.fn();
  const mockGetSignedUrl = jest.fn();
  const mockGetMetadata = jest.fn();
  const mockSetMetadata = jest.fn();

  const firestoreMock = {
    collection: jest.fn((collectionName) => {
        const baseMock = {
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
              empty: false,
              forEach: (callback) => callback({ id: `${collectionName}-1`, data: () => ({ name: `Test ${collectionName}` }) }),
            }),
            add: mockAdd,
            doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ proveedoresIds: ['supplier1'] })
                }),
                update: mockUpdate,
            })),
          };

          if (collectionName === 'proveedores') {
            baseMock.get = jest.fn().mockResolvedValue({
                docs: [{ id: 'supplier1', data: () => ({ name: 'Supplier A' }) }]
            });
          }
          if (collectionName === 'productosDeVenta') {
            baseMock.get = jest.fn().mockResolvedValue({
              docs: [{ id: 'product1', data: () => ({ name: 'Taco de Test' }) }]
            });
          }

      return baseMock;
    }),
    FieldValue: {
        arrayUnion: mockArrayUnion,
        arrayRemove: mockArrayRemove,
    },
  };

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

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    storage: {
      getStorage: () => storageMock,
    },
    auth: () => ({ verifyIdToken: jest.fn() }),
    app: () => ({ delete: jest.fn() }),
    __mockAdd: mockAdd,
    __mockUpdate: mockUpdate,
    __mockArrayUnion: mockArrayUnion,
    __mockArrayRemove: mockArrayRemove,
    __mockFileExists: mockFileExists,
    __mockGetSignedUrl: mockGetSignedUrl,
    __mockGetMetadata: mockGetMetadata,
    __mockSetMetadata: mockSetMetadata,
    __mockBucket: mockBucket,
    __mockFileMethods: mockFileMethods,
  };
});

// Mock del módulo 'firebase-admin/storage' que es el que realmente usa el endpoint
jest.mock('firebase-admin/storage', () => ({
  getStorage: () => {
    const admin = require('firebase-admin');
    return admin.storage.getStorage();
  },
}));

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split('Bearer ')[1];
    if (token === 'test-super-admin-token') {
      req.user = { uid: 'test-uid', email: 'admin@test.com', super_admin: true };
    } else if (token === 'test-admin-token') {
        req.user = { uid: 'test-admin-uid', email: 'admin@test.com', admin: true };
    } else if (token === 'test-regular-user-token') {
      req.user = { uid: 'test-uid-regular', email: 'user@test.com' };
    }
  }
  next();
}));


describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await admin.app().delete();
  });

  // ... (pruebas GET sin cambios)
  describe('GET /', () => {
    it('should respond with a welcome message', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('Hello from the Al Chile API Backend!');
    });
  });

  describe('POST /api/control/unidades-de-negocio', () => {
    const newBusinessUnit = { name: 'Test', razonSocial: 'Test SA de CV', address: '', phone: '', taxIdUrl: '' };

    it('should return 403 Forbidden if user is not a super_admin', async () => {
        const response = await request(app)
          .post('/api/control/unidades-de-negocio')
          .set('Authorization', 'Bearer test-regular-user-token')
          .send(newBusinessUnit);
        expect(response.statusCode).toBe(403);
      });
  
      it('should return 400 Bad Request if required fields are missing', async () => {
        const response = await request(app)
          .post('/api/control/unidades-de-negocio')
          .set('Authorization', 'Bearer test-super-admin-token')
          .send({ name: 'Only Name' }); // Falta razonSocial
        expect(response.statusCode).toBe(400);
      });

    it('should return 201 Created and the new document if successful', async () => {
      const response = await request(app)
        .post('/api/control/unidades-de-negocio')
        .set('Authorization', 'Bearer test-super-admin-token')
        .send(newBusinessUnit);

      expect(response.statusCode).toBe(201);
      expect(admin.__mockAdd).toHaveBeenCalledWith(
        expect.objectContaining(newBusinessUnit)
      );
      expect(response.body).toEqual(expect.objectContaining({
        id: 'new-doc-id',
        ...newBusinessUnit,
        deleted: false,
        createdAt: expect.any(String)
      }));
    });
  });

  describe('POST /api/control/unidades-de-negocio/:unidadId/departamentos', () => {
    const unidadId = 'test-unidad-id';
    const newDepartment = { name: 'Cocina', description: 'Departamento de cocina principal' };

    it('should return 403 Forbidden if user is not an admin or super_admin', async () => {
      const response = await request(app)
        .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos`)
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(newDepartment);
      expect(response.statusCode).toBe(403);
    });

    it('should return 400 Bad Request if name is missing', async () => {
      const response = await request(app)
        .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos`)
        .set('Authorization', 'Bearer test-admin-token')
        .send({ description: 'Sin nombre' }); // Sin nombre
      expect(response.statusCode).toBe(400);
    });

    it('should return 201 Created and the new department if successful for an admin user', async () => {
      const response = await request(app)
        .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos`)
        .set('Authorization', 'Bearer test-admin-token')
        .send(newDepartment);

      expect(response.statusCode).toBe(201);
      expect(admin.__mockAdd).toHaveBeenCalledWith({
        name: newDepartment.name,
        description: newDepartment.description,
        businessUnitId: unidadId,
        deleted: false,
        createdAt: expect.any(String),
      });
      expect(response.body).toEqual(expect.objectContaining({
        id: 'new-doc-id',
        ...newDepartment,
        businessUnitId: unidadId,
      }));
    });
  });

  describe('POST /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos', () => {
    const unidadId = 'test-unidad-id';
    const deptoId = 'test-depto-id';
    const newGroup = { name: 'Bebidas', description: 'Refrescos y aguas' };

    it('should return 403 Forbidden if user is not an admin', async () => {
      const response = await request(app)
        .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos`)
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(newGroup);
      expect(response.statusCode).toBe(403);
    });

    it('should return 400 Bad Request if name is missing', async () => {
      const response = await request(app)
        .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos`)
        .set('Authorization', 'Bearer test-admin-token')
        .send({ description: 'Sin nombre' });
      expect(response.statusCode).toBe(400);
    });

    it('should return 201 Created and the new group if successful', async () => {
      const response = await request(app)
        .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos`)
        .set('Authorization', 'Bearer test-admin-token')
        .send(newGroup);

      expect(response.statusCode).toBe(201);
      expect(admin.__mockAdd).toHaveBeenCalledWith({
        name: newGroup.name,
        description: newGroup.description,
        businessUnitId: unidadId,
        departmentId: deptoId,
        deleted: false,
        createdAt: expect.any(String),
      });
      expect(response.body).toEqual(expect.objectContaining({
        id: 'new-doc-id',
        ...newGroup,
      }));
    });
  });

  describe('GET /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos', () => {
    const unidadId = 'test-unidad-id';
    const deptoId = 'test-depto-id';

    it('should return 403 Forbidden if user is not an admin', async () => {
        const response = await request(app)
          .get(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos`)
          .set('Authorization', 'Bearer test-regular-user-token');
        expect(response.statusCode).toBe(403);
      });
  
      it('should return 200 OK and a list of groups if successful', async () => {
        const response = await request(app)
          .get(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos`)
          .set('Authorization', 'Bearer test-admin-token');
  
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0]).toHaveProperty('name', 'Test grupos');
      });
  });

  describe('Concept Endpoints', () => {
    const unidadId = 'test-unidad-id';
    const deptoId = 'test-depto-id';
    const grupoId = 'test-grupo-id';
    const newConcept = { name: 'Tomate', description: 'Tomate fresco' };

    describe('POST /.../conceptos', () => {
      it('should return 403 Forbidden if user is not an admin', async () => {
        const response = await request(app)
          .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos`)
          .set('Authorization', 'Bearer test-regular-user-token')
          .send(newConcept);
        expect(response.statusCode).toBe(403);
      });

      it('should return 400 Bad Request if name is missing', async () => {
        const response = await request(app)
          .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos`)
          .set('Authorization', 'Bearer test-admin-token')
          .send({ description: 'Sin nombre' });
        expect(response.statusCode).toBe(400);
      });

      it('should return 201 Created and the new concept if successful', async () => {
        const response = await request(app)
          .post(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos`)
          .set('Authorization', 'Bearer test-admin-token')
          .send(newConcept);

        expect(response.statusCode).toBe(201);
        expect(admin.__mockAdd).toHaveBeenCalledWith({
          name: newConcept.name,
          description: newConcept.description,
          businessUnitId: unidadId,
          departmentId: deptoId,
          groupId: grupoId,
          proveedoresIds: [],
          deleted: false,
          createdAt: expect.any(String),
        });
        expect(response.body).toEqual(expect.objectContaining({
          id: 'new-doc-id',
          ...newConcept,
        }));
      });
    });

    describe('GET /.../conceptos', () => {
        it('should return 403 Forbidden if user is not an admin', async () => {
            const response = await request(app)
              .get(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos`)
              .set('Authorization', 'Bearer test-regular-user-token');
            expect(response.statusCode).toBe(403);
          });
      
          it('should return 200 OK and a list of concepts if successful', async () => {
            const response = await request(app)
              .get(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos`)
              .set('Authorization', 'Bearer test-admin-token');
      
            expect(response.statusCode).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body[0]).toHaveProperty('name', 'Test conceptos');
          });
    });
  });

  describe('Supplier and Relationship Management', () => {
    const conceptoId = 'test-concepto-id';
    const proveedorId = 'test-proveedor-id';
    const supplierData = { name: 'Supplier B', contactName: 'John Doe', phone: '123', email: 'j@d.com' };

    describe('GET /api/control/proveedores', () => {
// ... (existing GET tests remain unchanged) ...
    });

    describe('POST /api/control/proveedores', () => {
        it('should return 403 for non-admin user', async () => {
            const res = await request(app)
              .post('/api/control/proveedores')
              .set('Authorization', 'Bearer test-regular-user-token')
              .send(supplierData);
            expect(res.statusCode).toBe(403);
        });

        it('should return 400 if name is missing', async () => {
            const { name, ...badData } = supplierData;
            const res = await request(app)
              .post('/api/control/proveedores')
              .set('Authorization', 'Bearer test-admin-token')
              .send(badData);
            expect(res.statusCode).toBe(400);
        });

        it('should return 201 and the new supplier for admin user', async () => {
            const res = await request(app)
              .post('/api/control/proveedores')
              .set('Authorization', 'Bearer test-admin-token')
              .send(supplierData);
            expect(res.statusCode).toBe(201);
            expect(admin.__mockAdd).toHaveBeenCalledWith(expect.objectContaining(supplierData));
            expect(res.body).toEqual(expect.objectContaining(supplierData));
        });
    });

    describe('PUT /api/control/proveedores/:proveedorId', () => {
        it('should return 403 for non-admin user', async () => {
            const res = await request(app)
              .put(`/api/control/proveedores/${proveedorId}`)
              .set('Authorization', 'Bearer test-regular-user-token')
              .send(supplierData);
            expect(res.statusCode).toBe(403);
        });

        it('should return 200 and update the supplier for admin user', async () => {
            const res = await request(app)
              .put(`/api/control/proveedores/${proveedorId}`)
              .set('Authorization', 'Bearer test-admin-token')
              .send(supplierData);
            expect(res.statusCode).toBe(200);
            expect(admin.__mockUpdate).toHaveBeenCalledWith(expect.objectContaining(supplierData));
        });
    });

    describe('DELETE /api/control/proveedores/:proveedorId', () => {
        it('should return 403 for non-admin user', async () => {
            const res = await request(app)
              .delete(`/api/control/proveedores/${proveedorId}`)
              .set('Authorization', 'Bearer test-regular-user-token');
            expect(res.statusCode).toBe(403);
        });

        it('should return 200 and soft delete the supplier for admin user', async () => {
            const res = await request(app)
              .delete(`/api/control/proveedores/${proveedorId}`)
              .set('Authorization', 'Bearer test-admin-token');
            expect(res.statusCode).toBe(200);
            expect(admin.__mockUpdate).toHaveBeenCalledWith({
                deleted: true,
                deletedAt: expect.any(String),
            });
        });
    });

    describe('GET /api/control/conceptos/:conceptoId/proveedores', () => {
// ... (existing relationship GET tests remain unchanged) ...
    });

    describe('POST /api/control/conceptos/:conceptoId/proveedores', () => {
// ... (existing relationship POST tests remain unchanged) ...
    });

    describe('DELETE /api/control/conceptos/:conceptoId/proveedores/:proveedorId', () => {
// ... (existing relationship DELETE tests remain unchanged) ...
    });
  });

  // --- PRUEBAS PARA ENDPOINTS PUT ---

  describe('PUT /api/control/unidades-de-negocio/:unidadId', () => {
    const unidadId = 'test-unidad-id';
    const updateData = { name: 'Updated Name', razonSocial: 'Updated RS' };

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}`)
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(updateData);
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}`)
        .set('Authorization', 'Bearer test-admin-token')
        .send({ name: 'Only Name' }); // Falta razonSocial
      expect(res.statusCode).toBe(400);
    });

    it('should return 200 and update the document for admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}`)
        .set('Authorization', 'Bearer test-admin-token')
        .send(updateData);
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(res.body).toEqual(expect.objectContaining(updateData));
    });
  });

  describe('DELETE /api/control/unidades-de-negocio/:unidadId', () => {
    const unidadId = 'test-unidad-id';

    it('should return 403 for non-super-admin user', async () => {
      const res = await request(app)
        .delete(`/api/control/unidades-de-negocio/${unidadId}`)
        .set('Authorization', 'Bearer test-admin-token'); // Regular admin, not super
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 if the business unit contains active departments', async () => {
      const firestoreMock = admin.firestore();
      firestoreMock.collection.mockImplementationOnce((collectionName) => {
        if (collectionName === 'departamentos') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: false }), // Simulate finding departments
          };
        }
        return jest.fn().mockReturnThis();
      });

      const res = await request(app)
        .delete(`/api/control/unidades-de-negocio/${unidadId}`)
        .set('Authorization', 'Bearer test-super-admin-token');
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('contiene departamentos activos');
    });

    it('should return 200 and soft delete the document for super_admin user if empty', async () => {
      const firestoreMock = admin.firestore();
      firestoreMock.collection.mockImplementationOnce((collectionName) => {
        if (collectionName === 'departamentos') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }), // Simulate no departments found
          };
        }
        return jest.fn().mockReturnThis();
      });

      const res = await request(app)
        .delete(`/api/control/unidades-de-negocio/${unidadId}`)
        .set('Authorization', 'Bearer test-super-admin-token');
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(String),
      });
    });
  });

  describe('PUT /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId', () => {
    const unidadId = 'test-unidad-id';
    const deptoId = 'test-depto-id';
    const updateData = { name: 'Updated Dept Name' };

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}`)
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(updateData);
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}`)
        .set('Authorization', 'Bearer test-admin-token')
        .send({ description: 'no name' });
      expect(res.statusCode).toBe(400);
    });

    it('should return 200 and update the document for admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}`)
        .set('Authorization', 'Bearer test-admin-token')
        .send(updateData);
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });
  });

  describe('DELETE /api/control/departamentos/:deptoId', () => {
    const deptoId = 'test-depto-id';

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/control/departamentos/${deptoId}`)
        .set('Authorization', 'Bearer test-regular-user-token');
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 if the department contains active groups', async () => {
      const firestoreMock = admin.firestore();
      firestoreMock.collection.mockImplementationOnce((collectionName) => {
        if (collectionName === 'grupos') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: false }), // Simulate finding groups
          };
        }
        return jest.fn().mockReturnThis();
      });

      const res = await request(app)
        .delete(`/api/control/departamentos/${deptoId}`)
        .set('Authorization', 'Bearer test-admin-token');
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('contiene grupos activos');
    });

    it('should return 200 and soft delete the document for admin user if department is empty', async () => {
      const firestoreMock = admin.firestore();
      firestoreMock.collection.mockImplementationOnce((collectionName) => {
        if (collectionName === 'grupos') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }), // Simulate no groups found
          };
        }
        return jest.fn().mockReturnThis();
      });
      
      const res = await request(app)
        .delete(`/api/control/departamentos/${deptoId}`)
        .set('Authorization', 'Bearer test-admin-token');
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(String),
      });
    });
  });

  describe('PUT /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId', () => {
    const unidadId = 'test-unidad-id';
    const deptoId = 'test-depto-id';
    const grupoId = 'test-grupo-id';
    const updateData = { name: 'Updated Group Name' };

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}`)
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(updateData);
      expect(res.statusCode).toBe(403);
    });

    it('should return 200 and update the document for admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}`)
        .set('Authorization', 'Bearer test-admin-token')
        .send(updateData);
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });
  });

  describe('DELETE /api/control/grupos/:grupoId', () => {
    const grupoId = 'test-grupo-id';
    let originalFirestoreMock;

    beforeEach(() => {
      // Save the original mock implementation
      originalFirestoreMock = admin.firestore().collection;
    });

    afterEach(() => {
      // Restore the original mock after each test
      admin.firestore().collection = originalFirestoreMock;
      jest.clearAllMocks();
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/control/grupos/${grupoId}`)
        .set('Authorization', 'Bearer test-regular-user-token');
      expect(res.statusCode).toBe(403);
    });

    it('should return 400 if the group contains active concepts', async () => {
      const firestoreMock = admin.firestore();
      firestoreMock.collection.mockImplementationOnce((collectionName) => {
        if (collectionName === 'conceptos') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: false }), // Simulate finding concepts
          };
        }
        return originalFirestoreMock(collectionName); // Use original for others
      });

      const res = await request(app)
        .delete(`/api/control/grupos/${grupoId}`)
        .set('Authorization', 'Bearer test-admin-token');
      
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('contiene conceptos activos');
    });

    it('should return 200 and soft delete the document if group is empty', async () => {
      const firestoreMock = admin.firestore();
      firestoreMock.collection.mockImplementationOnce((collectionName) => {
        if (collectionName === 'conceptos') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }), // Simulate no concepts found
          };
        }
        return originalFirestoreMock(collectionName); // Use original for others
      });

      const res = await request(app)
        .delete(`/api/control/grupos/${grupoId}`)
        .set('Authorization', 'Bearer test-admin-token');
      
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(String),
      });
    });
  });

  describe('PUT /api/control/unidades-de-negocio/:unidadId/departamentos/:deptoId/grupos/:grupoId/conceptos/:conceptoId', () => {
    const unidadId = 'test-unidad-id';
    const deptoId = 'test-depto-id';
    const grupoId = 'test-grupo-id';
    const conceptoId = 'test-concepto-id';
    const updateData = { name: 'Updated Concept Name' };

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos/${conceptoId}`)
        .set('Authorization', 'Bearer test-regular-user-token')
        .send(updateData);
      expect(res.statusCode).toBe(403);
    });

    it('should return 200 and update the document for admin user', async () => {
      const res = await request(app)
        .put(`/api/control/unidades-de-negocio/${unidadId}/departamentos/${deptoId}/grupos/${grupoId}/conceptos/${conceptoId}`)
        .set('Authorization', 'Bearer test-admin-token')
        .send(updateData);
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith(expect.objectContaining(updateData));
    });
  });

  describe('DELETE /api/control/conceptos/:conceptoId', () => {
    const conceptoId = 'test-concepto-id';

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .delete(`/api/control/conceptos/${conceptoId}`)
        .set('Authorization', 'Bearer test-regular-user-token');
      expect(res.statusCode).toBe(403);
    });

    it('should return 200 and soft delete the document for admin user', async () => {
      const res = await request(app)
        .delete(`/api/control/conceptos/${conceptoId}`)
        .set('Authorization', 'Bearer test-admin-token');
      expect(res.statusCode).toBe(200);
      expect(admin.__mockUpdate).toHaveBeenCalledWith({
        deleted: true,
        deletedAt: expect.any(String),
      });
    });
  });

  describe('GET /api/generate-signed-url', () => {
    beforeEach(() => {
      // Reset all mocks before each test
      jest.clearAllMocks();
    });

    it('should return 400 if filePath is missing', async () => {
      const response = await request(app).get('/api/generate-signed-url');
      expect(response.status).toBe(400);
      expect(response.text).toContain('Missing required query parameter: filePath');
    });

    it('should return 404 if file does not exist', async () => {
      // Mock file.exists() to return [false]
      admin.__mockFileExists.mockResolvedValueOnce([false]);

      const response = await request(app).get('/api/generate-signed-url?filePath=nonexistent.jpg');

      expect(response.status).toBe(404);
      expect(response.text).toContain('File not found');
      expect(admin.__mockFileExists).toHaveBeenCalled();
    });

    it('should return 200 and a public URL with token if file exists', async () => {
      const testToken = 'test-token-123';
      const testFilePath = 'productos/test.jpg';

      // Mock file.exists() to return [true]
      admin.__mockFileExists.mockResolvedValueOnce([true]);

      // Mock file.getMetadata() to return metadata with existing token
      admin.__mockGetMetadata.mockResolvedValueOnce([{
        metadata: {
          firebaseStorageDownloadTokens: testToken
        }
      }]);

      const response = await request(app).get(`/api/generate-signed-url?filePath=${testFilePath}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('signedUrl');
      expect(response.body.signedUrl).toContain(testToken);
      expect(response.body.signedUrl).toContain(encodeURIComponent(testFilePath));
      expect(admin.__mockFileExists).toHaveBeenCalled();
      expect(admin.__mockGetMetadata).toHaveBeenCalled();
    });

    it('should create a new token if file does not have one', async () => {
      const testFilePath = 'productos/new-file.jpg';

      // Mock file.exists() to return [true]
      admin.__mockFileExists.mockResolvedValueOnce([true]);

      // Mock file.getMetadata() to return metadata WITHOUT token
      admin.__mockGetMetadata.mockResolvedValueOnce([{
        metadata: {}
      }]);

      // Mock file.setMetadata()
      admin.__mockSetMetadata.mockResolvedValueOnce([{}]);

      const response = await request(app).get(`/api/generate-signed-url?filePath=${testFilePath}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('signedUrl');
      expect(response.body.signedUrl).toContain('alt=media&token=');
      expect(admin.__mockSetMetadata).toHaveBeenCalledWith({
        metadata: {
          firebaseStorageDownloadTokens: expect.any(String)
        }
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock file.exists() to throw an error
      admin.__mockFileExists.mockRejectedValueOnce(new Error('Storage error'));

      const response = await request(app).get('/api/generate-signed-url?filePath=error.jpg');

      expect(response.status).toBe(500);
      expect(response.text).toContain('Internal Server Error');
    });
  });

  describe('Swagger UI Endpoint /api-docs', () => {
    it('should return 403 Forbidden for unauthenticated users', async () => {
      const response = await request(app).get('/api-docs');
      // El middleware de authMiddleware no establece req.user, por lo que el siguiente middleware lo rechaza
      expect(response.statusCode).toBe(403);
    });

    it('should return 403 Forbidden for authenticated regular users', async () => {
      const response = await request(app)
        .get('/api-docs')
        .set('Authorization', 'Bearer test-regular-user-token');
      expect(response.statusCode).toBe(403);
    });

    it('should return 200 OK for super_admin users', async () => {
      const response = await request(app)
        .get('/api-docs')
        .set('Authorization', 'Bearer test-super-admin-token');
      // swagger-ui-express redirige, por lo que un 301 o 200 es éxito.
      // En supertest, no sigue la redirección y reporta el 301.
      expect(response.statusCode).toBe(301);
    });
  
    });
  });
  