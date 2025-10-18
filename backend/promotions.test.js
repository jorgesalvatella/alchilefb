const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock de firebase-admin con datos de prueba para promociones
jest.mock('firebase-admin', () => {
  // Base de datos mock con productos, categorías y promociones
  const mockDb = {
    products: {
      'prod-hamburguesa': {
        name: 'Hamburguesa Clásica',
        price: 80,
        deletedAt: null,
        categoriaVentaId: 'cat-comida'
      },
      'prod-papas': {
        name: 'Papas Grandes',
        price: 40,
        deletedAt: null,
        categoriaVentaId: 'cat-comida'
      },
      'prod-refresco': {
        name: 'Refresco 500ml',
        price: 25,
        deletedAt: null,
        categoriaVentaId: 'cat-bebidas'
      },
      'prod-deleted': {
        name: 'Producto Eliminado',
        price: 50,
        deletedAt: new Date('2024-01-01'),
        categoriaVentaId: 'cat-comida'
      }
    },
    categories: {
      'cat-comida': { name: 'Comida', deletedAt: null },
      'cat-bebidas': { name: 'Bebidas', deletedAt: null },
      'cat-deleted': { name: 'Categoría Eliminada', deletedAt: new Date('2024-01-01') }
    },
    promotions: {
      'promo-active-1': {
        name: 'Paquete Familiar',
        description: 'Incluye hamburguesa, papas y refresco',
        type: 'package',
        isActive: true,
        startDate: { toDate: () => new Date('2024-01-01') },
        endDate: { toDate: () => new Date('2026-12-31') },
        packagePrice: 120,
        packageItems: [
          { productId: 'prod-hamburguesa', name: 'Hamburguesa Clásica', quantity: 1 },
          { productId: 'prod-papas', name: 'Papas Grandes', quantity: 1 },
          { productId: 'prod-refresco', name: 'Refresco 500ml', quantity: 1 }
        ],
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
        deletedAt: null
      },
      'promo-active-2': {
        name: '20% OFF en Bebidas',
        description: 'Descuento en todas las bebidas',
        type: 'promotion',
        isActive: true,
        startDate: { toDate: () => new Date('2024-01-01') },
        endDate: { toDate: () => new Date('2026-12-31') },
        promoType: 'percentage',
        promoValue: 20,
        appliesTo: 'category',
        targetIds: ['cat-bebidas'],
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
        deletedAt: null
      },
      'promo-inactive': {
        name: 'Promoción Inactiva',
        type: 'promotion',
        isActive: false,
        deletedAt: null,
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') }
      },
      'promo-expired': {
        name: 'Promoción Expirada',
        type: 'promotion',
        isActive: true,
        startDate: { toDate: () => new Date('2023-01-01') },
        endDate: { toDate: () => new Date('2023-12-31') },
        deletedAt: null,
        createdAt: { toDate: () => new Date('2023-01-01') },
        updatedAt: { toDate: () => new Date('2023-01-01') }
      },
      'promo-not-started': {
        name: 'Promoción Futura',
        type: 'promotion',
        isActive: true,
        startDate: { toDate: () => new Date('2030-01-01') },
        endDate: { toDate: () => new Date('2030-12-31') },
        deletedAt: null,
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') }
      },
      'promo-deleted': {
        name: 'Promoción Eliminada',
        type: 'promotion',
        isActive: false,
        deletedAt: { toDate: () => new Date('2024-06-01') },
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') }
      }
    }
  };

  // Mock para operaciones de Firestore
  const mockAdd = jest.fn((data) => Promise.resolve({ id: 'new-promo-id' }));
  const mockUpdate = jest.fn(() => Promise.resolve());
  const mockDocGet = jest.fn((collection, docId) => {
    let data = null;
    if (collection === 'productosDeVenta') {
      data = mockDb.products[docId];
    } else if (collection === 'categoriasDeVenta') {
      data = mockDb.categories[docId];
    } else if (collection === 'promotions') {
      data = mockDb.promotions[docId];
    }

    return Promise.resolve({
      exists: !!data,
      data: () => data,
      id: docId
    });
  });

  const mockCollectionGet = jest.fn((collection, filters) => {
    let docs = [];

    if (collection === 'promotions') {
      // Filtrar promociones según los criterios
      docs = Object.entries(mockDb.promotions)
        .filter(([id, promo]) => {
          // Filtro: deletedAt == null
          if (filters.deletedAt === null && promo.deletedAt !== null) {
            return false;
          }
          // Filtro: isActive == true
          if (filters.isActive !== undefined && promo.isActive !== filters.isActive) {
            return false;
          }
          return true;
        })
        .map(([id, promo]) => ({
          id,
          data: () => promo
        }));
    }

    return Promise.resolve({
      empty: docs.length === 0,
      docs
    });
  });

  // Mock de query builder
  const createQueryMock = (collectionName) => {
    const filters = {};

    const queryMock = {
      where: jest.fn((field, operator, value) => {
        filters[field] = value;
        return queryMock;
      }),
      orderBy: jest.fn(() => queryMock),
      limit: jest.fn(() => queryMock),
      get: jest.fn(() => mockCollectionGet(collectionName, filters))
    };

    return queryMock;
  };

  const firestoreMock = {
    collection: jest.fn((collectionName) => ({
      ...createQueryMock(collectionName),
      add: mockAdd,
      doc: jest.fn((docId) => ({
        get: () => mockDocGet(collectionName, docId),
        update: mockUpdate
      }))
    }))
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    auth: () => ({ verifyIdToken: jest.fn() }),
    app: () => ({ delete: jest.fn() }),
    // Exportar mocks para assertions
    __mockAdd: mockAdd,
    __mockUpdate: mockUpdate,
    __mockDocGet: mockDocGet,
    __mockCollectionGet: mockCollectionGet
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.split('Bearer ')[1];
    if (token === 'admin-token') {
      req.user = { uid: 'admin-uid', email: 'admin@test.com', admin: true };
    } else if (token === 'user-token') {
      req.user = { uid: 'user-uid', email: 'user@test.com' };
    }
  }
  next();
}));

describe('Promotions API - GET /api/promotions (público)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return only active and valid promotions for public users', async () => {
    const response = await request(app)
      .get('/api/promotions');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    // Debería incluir solo las 2 promociones activas y vigentes
    // (promo-active-1 y promo-active-2)
    expect(response.body.length).toBe(2);

    // Verificar que incluye las promociones activas
    const promoNames = response.body.map(p => p.name);
    expect(promoNames).toContain('Paquete Familiar');
    expect(promoNames).toContain('20% OFF en Bebidas');

    // Verificar que NO incluye inactivas, expiradas o futuras
    expect(promoNames).not.toContain('Promoción Inactiva');
    expect(promoNames).not.toContain('Promoción Expirada');
    expect(promoNames).not.toContain('Promoción Futura');
    expect(promoNames).not.toContain('Promoción Eliminada');
  });

  it('should return promotion data with correct structure', async () => {
    const response = await request(app)
      .get('/api/promotions');

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);

    const packagePromo = response.body.find(p => p.type === 'package');
    expect(packagePromo).toBeDefined();
    expect(packagePromo).toHaveProperty('id');
    expect(packagePromo).toHaveProperty('name');
    expect(packagePromo).toHaveProperty('description');
    expect(packagePromo).toHaveProperty('type', 'package');
    expect(packagePromo).toHaveProperty('packagePrice');
    expect(packagePromo).toHaveProperty('packageItems');
    expect(packagePromo.packageItems).toBeInstanceOf(Array);
  });

  it('should return empty array when no active promotions exist', async () => {
    // Modificar el mock temporalmente para retornar vacío
    admin.__mockCollectionGet.mockResolvedValueOnce({
      empty: true,
      docs: []
    });

    const response = await request(app)
      .get('/api/promotions');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should handle server errors gracefully', async () => {
    // Forzar un error en el mock
    admin.__mockCollectionGet.mockRejectedValueOnce(new Error('Database error'));

    const response = await request(app)
      .get('/api/promotions');

    expect(response.statusCode).toBe(500);
    expect(response.body).toHaveProperty('message', 'Internal Server Error');
  });
});

describe('Promotions API - GET /api/control/promotions (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if user is not admin', async () => {
    const response = await request(app)
      .get('/api/control/promotions')
      .set('Authorization', 'Bearer user-token');

    expect(response.statusCode).toBe(403);
  });

  it('should return all promotions (including inactive) for admins', async () => {
    const response = await request(app)
      .get('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);

    // Debería incluir todas las promociones no eliminadas (5 en total)
    expect(response.body.length).toBe(5);

    const promoNames = response.body.map(p => p.name);
    expect(promoNames).toContain('Promoción Inactiva');
    expect(promoNames).toContain('Promoción Expirada');
    expect(promoNames).toContain('Promoción Futura');

    // No debería incluir la eliminada
    expect(promoNames).not.toContain('Promoción Eliminada');
  });

  it('should return promotions with full details including timestamps', async () => {
    const response = await request(app)
      .get('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token');

    expect(response.statusCode).toBe(200);

    const promo = response.body[0];
    expect(promo).toHaveProperty('createdAt');
    expect(promo).toHaveProperty('updatedAt');
  });
});

describe('Promotions API - POST /api/control/promotions (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if user is not admin', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer user-token')
      .send({ name: 'Test', type: 'package' });

    expect(response.statusCode).toBe(403);
  });

  it('should return 400 if name is missing', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({ type: 'package' });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('name');
  });

  it('should return 400 if type is invalid', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({ name: 'Test', type: 'invalid' });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('type');
  });

  // VALIDACIONES DE FECHAS (Raptoure Security Check #1)
  it('should return 400 if endDate is before startDate', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Package',
        type: 'package',
        packagePrice: 100,
        packageItems: [{ productId: 'prod-hamburguesa', name: 'Hamburguesa', quantity: 1 }],
        startDate: '2025-12-31',
        endDate: '2025-01-01'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('fecha de fin debe ser posterior');
  });

  // VALIDACIONES DE PAQUETES
  it('should return 400 if package has no packagePrice', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Package',
        type: 'package',
        packageItems: [{ productId: 'prod-hamburguesa', name: 'Hamburguesa', quantity: 1 }]
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('packagePrice');
  });

  it('should return 400 if package has invalid packagePrice', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Package',
        type: 'package',
        packagePrice: -10,
        packageItems: [{ productId: 'prod-hamburguesa', name: 'Hamburguesa', quantity: 1 }]
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('mayor a 0');
  });

  it('should return 400 if package has empty packageItems', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Package',
        type: 'package',
        packagePrice: 100,
        packageItems: []
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('al menos un producto');
  });

  // VALIDACIONES DE SEGURIDAD DE RAPTOURE #2: Validar que productos existan
  it('should return 400 if package contains non-existent product', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Package',
        type: 'package',
        packagePrice: 100,
        packageItems: [
          { productId: 'prod-non-existent', name: 'Producto Falso', quantity: 1 }
        ]
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('no encontrado');
  });

  // VALIDACIONES DE SEGURIDAD DE RAPTOURE #3: Validar que productos no estén eliminados
  it('should return 400 if package contains deleted product', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Package',
        type: 'package',
        packagePrice: 100,
        packageItems: [
          { productId: 'prod-deleted', name: 'Producto Eliminado', quantity: 1 }
        ]
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('eliminado');
  });

  it('should create package successfully with valid data', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Nuevo Paquete',
        description: 'Paquete de prueba',
        type: 'package',
        isActive: true,
        packagePrice: 150,
        packageItems: [
          { productId: 'prod-hamburguesa', name: 'Hamburguesa Clásica', quantity: 2 },
          { productId: 'prod-refresco', name: 'Refresco 500ml', quantity: 2 }
        ]
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id', 'new-promo-id');
    expect(response.body.name).toBe('Nuevo Paquete');
    expect(admin.__mockAdd).toHaveBeenCalled();
  });

  // VALIDACIONES DE PROMOCIONES
  it('should return 400 if promotion has invalid promoType', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'invalid',
        promoValue: 10,
        appliesTo: 'product',
        targetIds: ['prod-hamburguesa']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('promoType');
  });

  // VALIDACIONES DE SEGURIDAD DE RAPTOURE #4: Descuentos porcentuales entre 0-100
  it('should return 400 if percentage discount is greater than 100', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 150,
        appliesTo: 'product',
        targetIds: ['prod-hamburguesa']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('entre 0 y 100');
  });

  it('should return 400 if percentage discount is negative', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: -10,
        appliesTo: 'product',
        targetIds: ['prod-hamburguesa']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('entre 0 y 100');
  });

  it('should return 400 if fixed_amount discount is negative', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'fixed_amount',
        promoValue: -50,
        appliesTo: 'product',
        targetIds: ['prod-hamburguesa']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('no puede ser negativo');
  });

  it('should return 400 if appliesTo is invalid', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'invalid',
        targetIds: ['prod-hamburguesa']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('appliesTo');
  });

  // VALIDACIONES DE SEGURIDAD DE RAPTOURE #5: targetIds no vacío para promociones específicas
  it('should return 400 if targetIds is empty for product-specific promotion', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'product',
        targetIds: []
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('targetIds');
  });

  it('should return 400 if targetIds is empty for category-specific promotion', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'category',
        targetIds: []
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('targetIds');
  });

  // VALIDACIONES DE SEGURIDAD DE RAPTOURE #6: Validar que categorías existan
  it('should return 400 if category in targetIds does not exist', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'category',
        targetIds: ['cat-non-existent']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('no existe');
  });

  it('should return 400 if category in targetIds is deleted', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'category',
        targetIds: ['cat-deleted']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('eliminada');
  });

  // VALIDACIONES DE SEGURIDAD DE RAPTOURE #7: Validar que productos en targetIds existan
  it('should return 400 if product in targetIds does not exist', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'product',
        targetIds: ['prod-non-existent']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('no existe');
  });

  it('should return 400 if product in targetIds is deleted', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Test Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'product',
        targetIds: ['prod-deleted']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('eliminado');
  });

  it('should create promotion successfully for product', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Nueva Promoción',
        description: 'Descuento en hamburguesas',
        type: 'promotion',
        isActive: true,
        promoType: 'percentage',
        promoValue: 15,
        appliesTo: 'product',
        targetIds: ['prod-hamburguesa']
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id', 'new-promo-id');
    expect(response.body.name).toBe('Nueva Promoción');
    expect(admin.__mockAdd).toHaveBeenCalled();
  });

  it('should create promotion successfully for category', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Descuento en Bebidas',
        type: 'promotion',
        promoType: 'fixed_amount',
        promoValue: 5,
        appliesTo: 'category',
        targetIds: ['cat-bebidas']
      });

    expect(response.statusCode).toBe(201);
    expect(admin.__mockAdd).toHaveBeenCalled();
  });

  it('should create promotion successfully for total_order without targetIds', async () => {
    const response = await request(app)
      .post('/api/control/promotions')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: '10% en todo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'total_order'
      });

    expect(response.statusCode).toBe(201);
    expect(admin.__mockAdd).toHaveBeenCalled();
  });
});

describe('Promotions API - PUT /api/control/promotions/:id (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if user is not admin', async () => {
    const response = await request(app)
      .put('/api/control/promotions/promo-active-1')
      .set('Authorization', 'Bearer user-token')
      .send({ name: 'Updated', type: 'package' });

    expect(response.statusCode).toBe(403);
  });

  it('should return 404 if promotion does not exist', async () => {
    const response = await request(app)
      .put('/api/control/promotions/non-existent')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Updated',
        type: 'package',
        packagePrice: 100,
        packageItems: [{ productId: 'prod-hamburguesa', name: 'Test', quantity: 1 }]
      });

    expect(response.statusCode).toBe(404);
  });

  it('should apply same validations as POST - invalid dates', async () => {
    const response = await request(app)
      .put('/api/control/promotions/promo-active-1')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Updated Package',
        type: 'package',
        packagePrice: 100,
        packageItems: [{ productId: 'prod-hamburguesa', name: 'Hamburguesa', quantity: 1 }],
        startDate: '2025-12-31',
        endDate: '2025-01-01'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('fecha de fin');
  });

  it('should apply same validations as POST - invalid percentage', async () => {
    const response = await request(app)
      .put('/api/control/promotions/promo-active-2')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Updated Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 150,
        appliesTo: 'category',
        targetIds: ['cat-bebidas']
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('entre 0 y 100');
  });

  it('should apply same validations as POST - empty targetIds', async () => {
    const response = await request(app)
      .put('/api/control/promotions/promo-active-2')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Updated Promo',
        type: 'promotion',
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'product',
        targetIds: []
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toContain('targetIds');
  });

  it('should update promotion successfully', async () => {
    const response = await request(app)
      .put('/api/control/promotions/promo-active-1')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Paquete Familiar Actualizado',
        description: 'Nueva descripción',
        type: 'package',
        isActive: true,
        packagePrice: 140,
        packageItems: [
          { productId: 'prod-hamburguesa', name: 'Hamburguesa Clásica', quantity: 2 }
        ]
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Paquete Familiar Actualizado');
    expect(admin.__mockUpdate).toHaveBeenCalled();
  });
});

describe('Promotions API - DELETE /api/control/promotions/:id (admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if user is not admin', async () => {
    const response = await request(app)
      .delete('/api/control/promotions/promo-active-1')
      .set('Authorization', 'Bearer user-token');

    expect(response.statusCode).toBe(403);
  });

  it('should return 404 if promotion does not exist', async () => {
    const response = await request(app)
      .delete('/api/control/promotions/non-existent')
      .set('Authorization', 'Bearer admin-token');

    expect(response.statusCode).toBe(404);
  });

  it('should perform soft delete correctly', async () => {
    const response = await request(app)
      .delete('/api/control/promotions/promo-active-1')
      .set('Authorization', 'Bearer admin-token');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toContain('eliminada exitosamente');

    // Verificar que se llamó update con deletedAt y isActive: false
    expect(admin.__mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        deletedAt: expect.any(Date)
      })
    );
  });

  it('should deactivate promotion during soft delete', async () => {
    const response = await request(app)
      .delete('/api/control/promotions/promo-active-2')
      .set('Authorization', 'Bearer admin-token');

    expect(response.statusCode).toBe(200);

    // Verificar que isActive se pone en false
    expect(admin.__mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false
      })
    );
  });
});
