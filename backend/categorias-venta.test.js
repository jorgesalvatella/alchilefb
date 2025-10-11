const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de Firestore y Auth. Esto se hace una vez y se aplica a todas las pruebas en este archivo.
jest.mock('firebase-admin', () => {
  const mockAdd = jest.fn(() => Promise.resolve({ id: 'new-category-id' }));
  const mockUpdate = jest.fn(() => Promise.resolve());
  
  const mockGet = jest.fn().mockResolvedValue({
    docs: [{ id: 'category-1', data: () => ({ name: 'Test Category' }) }],
  });

  const firestoreMock = {
    collection: jest.fn(() => ({
      add: mockAdd,
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: mockGet,
      doc: jest.fn(() => ({
        update: mockUpdate,
      })),
    })),
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    auth: () => ({ verifyIdToken: jest.fn() }),
    app: () => ({ delete: jest.fn() }),
    // Exponemos mocks para poder espiarlos en las pruebas
    __mockAdd: mockAdd,
    __mockGet: mockGet,
    __mockUpdate: mockUpdate,
  };
});

// Mock del middleware de autenticación para simular diferentes roles de usuario
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

describe('POST /api/control/catalogo/categorias-venta', () => {
  // Limpiar mocks antes de cada prueba para asegurar que no haya interferencias
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const newCategoryData = {
    name: 'Bebidas Calientes',
    description: 'Café, té y chocolate',
    businessUnitId: 'bu-123',
    departmentId: 'dep-456',
  };

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .post('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-regular-user-token')
      .send(newCategoryData);
    
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toContain('admin or super_admin role required');
  });

  it('should return 400 Bad Request if required field "name" is missing', async () => {
    const { name, ...incompleteData } = newCategoryData;
    const response = await request(app)
      .post('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(incompleteData);
      
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('Missing required fields');
  });

  it('should return 400 Bad Request if required field "businessUnitId" is missing', async () => {
    const { businessUnitId, ...incompleteData } = newCategoryData;
    const response = await request(app)
      .post('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(incompleteData);
      
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('Missing required fields');
  });

  it('should return 400 Bad Request if required field "departmentId" is missing', async () => {
    const { departmentId, ...incompleteData } = newCategoryData;
    const response = await request(app)
      .post('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(incompleteData);
      
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('Missing required fields');
  });

  it('should return 201 Created and the new category document on successful creation', async () => {
    const response = await request(app)
      .post('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-admin-token')
      .send(newCategoryData);

    expect(response.statusCode).toBe(201);
    
    // Verificar que la función 'add' de Firestore fue llamada con los datos correctos
    expect(admin.__mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: newCategoryData.name,
        description: newCategoryData.description,
        businessUnitId: newCategoryData.businessUnitId,
        departmentId: newCategoryData.departmentId,
        deletedAt: null,
      })
    );

    // Verificar que la respuesta del API contiene los datos esperados
    expect(response.body).toEqual(expect.objectContaining({
      id: 'new-category-id',
      ...newCategoryData,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }));
  });
});

describe('GET /api/control/catalogo/categorias-venta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .get('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-regular-user-token');
    
    expect(response.statusCode).toBe(403);
  });

  it('should return 200 OK and a list of sale categories for an admin user', async () => {
    const response = await request(app)
      .get('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-admin-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toEqual(expect.objectContaining({
      id: 'category-1',
      name: 'Test Category',
    }));
  });

  it('should return an empty array if there are no categories', async () => {
    // Sobrescribir el mock para este caso de prueba específico
    const mockGet = jest.fn().mockResolvedValue({
      docs: [],
    });
    admin.firestore().collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: mockGet,
    });

    const response = await request(app)
      .get('/api/control/catalogo/categorias-venta')
      .set('Authorization', 'Bearer test-admin-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe('GET /api/control/departamentos/:deptoId/categorias-venta', () => {
  const deptoId = 'dep-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .get(`/api/control/departamentos/${deptoId}/categorias-venta`)
      .set('Authorization', 'Bearer test-regular-user-token');
    
    expect(response.statusCode).toBe(403);
  });

  it('should return 200 OK and a list of categories for the specific department', async () => {
    const mockGet = jest.fn().mockResolvedValue({
      docs: [{ id: 'category-1', data: () => ({ name: 'Filtered Category', departmentId: deptoId }) }],
    });
    admin.firestore().collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: mockGet,
    });

    const response = await request(app)
      .get(`/api/control/departamentos/${deptoId}/categorias-venta`)
      .set('Authorization', 'Bearer test-admin-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body[0]).toEqual(expect.objectContaining({
      name: 'Filtered Category',
      departmentId: deptoId,
    }));
    // Verificamos que el mock de 'where' fue llamado con el departmentId correcto
    expect(admin.firestore().collection().where).toHaveBeenCalledWith('departmentId', '==', deptoId);
  });
});

describe('PUT /api/control/catalogo/categorias-venta/:id', () => {
  const categoryId = 'test-category-id';
  const updateData = {
    name: 'Bebidas Frías',
    description: 'Jugos y refrescos',
    businessUnitId: 'bu-123',
    departmentId: 'dep-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .put(`/api/control/catalogo/categorias-venta/${categoryId}`)
      .set('Authorization', 'Bearer test-regular-user-token')
      .send(updateData);
    
    expect(response.statusCode).toBe(403);
  });

  it('should return 400 Bad Request if required fields are missing', async () => {
    const { name, ...incompleteData } = updateData;
    const response = await request(app)
      .put(`/api/control/catalogo/categorias-venta/${categoryId}`)
      .set('Authorization', 'Bearer test-admin-token')
      .send(incompleteData);
      
    expect(response.statusCode).toBe(400);
  });

  it('should return 200 OK and the updated data on successful update', async () => {
    const mockUpdate = jest.fn().mockResolvedValue();
    admin.firestore().collection.mockReturnValue({
      doc: jest.fn(() => ({
        update: mockUpdate,
      })),
    });

    const response = await request(app)
      .put(`/api/control/catalogo/categorias-venta/${categoryId}`)
      .set('Authorization', 'Bearer test-admin-token')
      .send(updateData);

    expect(response.statusCode).toBe(200);
    
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: updateData.name,
        description: updateData.description,
        businessUnitId: updateData.businessUnitId,
        departmentId: updateData.departmentId,
        updatedAt: expect.any(Date),
      })
    );

    expect(response.body).toEqual(expect.objectContaining({
      id: categoryId,
      ...updateData,
    }));
  });
});

describe('DELETE /api/control/catalogo/categorias-venta/:id', () => {
  const categoryId = 'test-category-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 Forbidden if user is not an admin', async () => {
    const response = await request(app)
      .delete(`/api/control/catalogo/categorias-venta/${categoryId}`)
      .set('Authorization', 'Bearer test-regular-user-token');
    
    expect(response.statusCode).toBe(403);
  });

  it('should return 400 Bad Request if the category has active products', async () => {
    // Mock Firestore to simulate finding products for this category
    const mockGetWithProducts = jest.fn().mockResolvedValue({ empty: false });
    admin.firestore().collection.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockGetWithProducts,
    });

    const response = await request(app)
      .delete(`/api/control/catalogo/categorias-venta/${categoryId}`)
      .set('Authorization', 'Bearer test-admin-token');

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('Cannot delete category with active products');
  });

  it('should return 200 OK and soft delete the category if it has no active products', async () => {
    // Mock Firestore to simulate finding no products
    const mockGetWithoutProducts = jest.fn().mockResolvedValue({ empty: true });
    const mockUpdate = jest.fn().mockResolvedValue();
    admin.firestore().collection.mockImplementation((collectionName) => {
      if (collectionName === 'productosDeVenta') {
        return {
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          get: mockGetWithoutProducts,
        };
      }
      if (collectionName === 'categoriasDeVenta') {
        return {
          doc: jest.fn(() => ({
            update: mockUpdate,
          })),
        };
      }
    });

    const response = await request(app)
      .delete(`/api/control/catalogo/categorias-venta/${categoryId}`)
      .set('Authorization', 'Bearer test-admin-token');

    expect(response.statusCode).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      deletedAt: expect.any(Date),
    });
    expect(response.body.message).toContain('Sale category deleted successfully');
  });
});
