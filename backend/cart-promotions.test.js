const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock completo de firebase-admin con productos, promociones y paquetes
jest.mock('firebase-admin', () => {
  // Base de datos mock con productos, promociones y paquetes
  const mockDb = {
    products: {
      'prod-hamburguesa': {
        name: 'Hamburguesa Clásica',
        price: 80.00,
        basePrice: 80.00 / 1.16, // ~68.97
        isTaxable: true,
        categoriaVentaId: 'cat-comida',
        ingredientesExtra: [
          { nombre: 'Queso Extra', precio: 15.00 },
          { nombre: 'Aguacate', precio: 20.00 }
        ]
      },
      'prod-papas': {
        name: 'Papas Grandes',
        price: 40.00,
        basePrice: 40.00 / 1.16, // ~34.48
        isTaxable: true,
        categoriaVentaId: 'cat-comida',
        ingredientesExtra: []
      },
      'prod-refresco': {
        name: 'Refresco 500ml',
        price: 25.00,
        basePrice: 25.00, // Sin IVA
        isTaxable: false,
        categoriaVentaId: 'cat-bebidas',
        ingredientesExtra: []
      },
      'prod-pizza': {
        name: 'Pizza Grande',
        price: 200.00,
        basePrice: 200.00 / 1.16, // ~172.41
        isTaxable: true,
        categoriaVentaId: 'cat-comida',
        ingredientesExtra: [
          { nombre: 'Pepperoni Extra', precio: 30.00 }
        ]
      },
      'prod-ensalada': {
        name: 'Ensalada César',
        price: 90.00,
        basePrice: 90.00 / 1.16, // ~77.59
        isTaxable: true,
        categoriaVentaId: 'cat-comida',
        ingredientesExtra: []
      }
    },
    promotions: {
      // Paquete: Combo familiar con 3 productos
      'package-familiar': {
        name: 'Paquete Familiar',
        description: 'Hamburguesa + Papas + Refresco',
        type: 'package',
        isActive: true,
        startDate: { toDate: () => new Date('2024-01-01') },
        endDate: { toDate: () => new Date('2026-12-31') },
        packagePrice: 120.00, // Precio especial (normalmente sería 145)
        packageItems: [
          { productId: 'prod-hamburguesa', name: 'Hamburguesa Clásica', quantity: 1 },
          { productId: 'prod-papas', name: 'Papas Grandes', quantity: 1 },
          { productId: 'prod-refresco', name: 'Refresco 500ml', quantity: 1 }
        ],
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
        deletedAt: null
      },
      // Promoción: 20% descuento en bebidas
      'promo-bebidas': {
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
      // Promoción: $50 descuento en pizzas
      'promo-pizza': {
        name: '$50 OFF en Pizza Grande',
        description: 'Descuento fijo en pizzas',
        type: 'promotion',
        isActive: true,
        startDate: { toDate: () => new Date('2024-01-01') },
        endDate: { toDate: () => new Date('2026-12-31') },
        promoType: 'fixed_amount',
        promoValue: 50,
        appliesTo: 'product',
        targetIds: ['prod-pizza'],
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
        deletedAt: null
      },
      // Promoción: 10% descuento en total del pedido
      'promo-total': {
        name: '10% OFF en tu pedido',
        description: 'Descuento en el total',
        type: 'promotion',
        isActive: true,
        startDate: { toDate: () => new Date('2024-01-01') },
        endDate: { toDate: () => new Date('2026-12-31') },
        promoType: 'percentage',
        promoValue: 10,
        appliesTo: 'total_order',
        targetIds: [],
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
        deletedAt: null
      },
      // Promoción inactiva (no debe aplicarse)
      'promo-inactive': {
        name: 'Promoción Inactiva',
        type: 'promotion',
        isActive: false,
        promoType: 'percentage',
        promoValue: 50,
        appliesTo: 'category',
        targetIds: ['cat-comida'],
        deletedAt: null,
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') }
      }
    }
  };

  // Mock para obtener un documento específico
  const mockDocGet = jest.fn((collection, docId) => {
    let data = null;
    if (collection === 'productosDeVenta') {
      data = mockDb.products[docId];
    } else if (collection === 'promotions') {
      data = mockDb.promotions[docId];
    }

    return Promise.resolve({
      exists: !!data,
      data: () => data,
      id: docId
    });
  });

  // Mock para consultas de colección (obtener promociones activas)
  const mockCollectionGet = jest.fn((collection, filters = {}) => {
    let docs = [];

    if (collection === 'promotions') {
      // Filtrar promociones activas y no eliminadas
      docs = Object.entries(mockDb.promotions)
        .filter(([id, promo]) => {
          if (filters.isActive !== undefined && promo.isActive !== filters.isActive) {
            return false;
          }
          if (filters.deletedAt !== undefined && promo.deletedAt !== filters.deletedAt) {
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
      docs,
      forEach: (callback) => docs.forEach((doc) => callback(doc))
    });
  });

  // Mock del query builder
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
      doc: jest.fn((docId) => ({
        get: () => mockDocGet(collectionName, docId)
      }))
    }))
  };

  return {
    initializeApp: jest.fn(),
    applicationDefault: jest.fn(),
    firestore: () => firestoreMock,
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid' })
    }),
    app: () => ({ delete: jest.fn() }),
    // Exportar mocks para assertions
    __mockDocGet: mockDocGet,
    __mockCollectionGet: mockCollectionGet
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  req.user = { uid: 'test-uid' };
  next();
}));

describe('Cart with Promotions - POST /api/cart/verify-totals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1: Carrito con productos normales (sin promociones)
  describe('Normal products (without promotions)', () => {
    it('should calculate totals correctly for products without promotions', async () => {
      const items = [
        {
          productId: 'prod-hamburguesa',
          quantity: 2,
          customizations: { added: [], removed: [] }
        },
        {
          productId: 'prod-papas',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('summary');

      // Hamburguesa: 80 * 2 = 160
      // Papas: 40 * 1 = 40
      // Total: 200
      expect(res.body.summary.totalFinal).toBeCloseTo(200.00, 2);
    });

    it('should calculate with customizations (extras) correctly', async () => {
      const items = [
        {
          productId: 'prod-hamburguesa',
          quantity: 1,
          customizations: {
            added: ['Queso Extra', 'Aguacate'],
            removed: []
          }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Hamburguesa: 80 + Queso (15) + Aguacate (20) = 115
      expect(res.body.summary.totalFinal).toBeCloseTo(115.00, 2);
      expect(res.body.items[0].name).toContain('Queso Extra');
      expect(res.body.items[0].name).toContain('Aguacate');
    });
  });

  // TEST 2: Carrito con productos con descuento de promoción
  describe('Products with promotion discounts', () => {
    it('should apply category-based percentage discount (20% on bebidas)', async () => {
      const items = [
        {
          productId: 'prod-refresco',
          quantity: 2,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Refresco: 25 * 2 = 50
      // Descuento 20%: 50 * 0.20 = 10
      // Total con descuento: 50 - 10 = 40
      expect(res.body.summary.totalFinal).toBeCloseTo(40.00, 2);

      // Verificar que la promoción se aplicó
      expect(res.body.items[0].appliedPromotion).toBeDefined();
      expect(res.body.items[0].appliedPromotion.name).toBe('20% OFF en Bebidas');
      expect(res.body.items[0].appliedPromotion.discount).toBeCloseTo(10.00, 2);
    });

    it('should apply product-based fixed discount ($50 on pizza)', async () => {
      const items = [
        {
          productId: 'prod-pizza',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Pizza: 200 - 50 (descuento fijo) = 150
      expect(res.body.summary.totalFinal).toBeCloseTo(150.00, 2);

      expect(res.body.items[0].appliedPromotion).toBeDefined();
      expect(res.body.items[0].appliedPromotion.name).toBe('$50 OFF en Pizza Grande');
      expect(res.body.items[0].appliedPromotion.discount).toBe(50);
    });

    it('should apply discount even with extras added', async () => {
      const items = [
        {
          productId: 'prod-pizza',
          quantity: 1,
          customizations: {
            added: ['Pepperoni Extra'],
            removed: []
          }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Pizza: 200 + Extra (30) = 230
      // Descuento fijo: -50
      // Total: 180
      expect(res.body.summary.totalFinal).toBeCloseTo(180.00, 2);
    });

    it('should NOT apply inactive promotions', async () => {
      // La promoción inactiva 'promo-inactive' no debe aplicarse
      const items = [
        {
          productId: 'prod-ensalada',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Ensalada: 90 (sin descuento porque la promo está inactiva)
      expect(res.body.summary.totalFinal).toBeCloseTo(90.00, 2);
      expect(res.body.items[0].appliedPromotion).toBeNull();
    });
  });

  // TEST 3: Carrito con paquetes (packageId) + personalizaciones
  describe('Packages with customizations', () => {
    it('should calculate package price correctly without customizations', async () => {
      const items = [
        {
          packageId: 'package-familiar',
          quantity: 1,
          packageCustomizations: {}
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);
      expect(res.body.items[0].type).toBe('package');
      expect(res.body.items[0].packageName).toBe('Paquete Familiar');

      // Precio del paquete: 120
      expect(res.body.summary.totalFinal).toBeCloseTo(120.00, 2);
    });

    it('should add extras to package items correctly', async () => {
      const items = [
        {
          packageId: 'package-familiar',
          quantity: 1,
          packageCustomizations: {
            'prod-hamburguesa': {
              added: ['Queso Extra', 'Aguacate'],
              removed: []
            }
          }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Paquete base: 120
      // + Queso Extra (15) + Aguacate (20) = 155
      expect(res.body.summary.totalFinal).toBeCloseTo(155.00, 2);

      // Verificar que los extras se reflejan en los detalles
      const hamburguesa = res.body.items[0].packageItems.find(
        item => item.productId === 'prod-hamburguesa'
      );
      expect(hamburguesa.addedCustomizations).toContain('Queso Extra');
      expect(hamburguesa.addedCustomizations).toContain('Aguacate');
    });

    it('should calculate multiple packages correctly', async () => {
      const items = [
        {
          packageId: 'package-familiar',
          quantity: 2,
          packageCustomizations: {}
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Paquete: 120 * 2 = 240
      expect(res.body.summary.totalFinal).toBeCloseTo(240.00, 2);
    });

    it('should return 400 if packageId does not exist', async () => {
      const items = [
        {
          packageId: 'package-non-existent',
          quantity: 1,
          packageCustomizations: {}
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('no encontrado');
    });

    it('should return 400 if packageId is not a package type', async () => {
      const items = [
        {
          packageId: 'promo-bebidas', // Esta es una promoción, no un paquete
          quantity: 1,
          packageCustomizations: {}
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('no corresponde a un paquete');
    });
  });

  // TEST 4: Carrito con promoción de orden total
  describe('Total order promotions', () => {
    it('should apply total order discount (10% on entire cart)', async () => {
      const items = [
        {
          productId: 'prod-hamburguesa',
          quantity: 2,
          customizations: { added: [], removed: [] }
        },
        {
          productId: 'prod-papas',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Hamburguesa: 80 * 2 = 160
      // Papas: 40 * 1 = 40
      // Subtotal: 200
      // Descuento total 10%: 200 * 0.10 = 20
      // Total: 200 - 20 = 180
      expect(res.body.summary.totalFinal).toBeCloseTo(180.00, 2);

      // Verificar que se aplicó la promoción de orden
      expect(res.body.summary.appliedOrderPromotion).toBeDefined();
      expect(res.body.summary.appliedOrderPromotion.name).toBe('10% OFF en tu pedido');
      expect(res.body.summary.appliedOrderPromotion.discount).toBeCloseTo(20.00, 2);
    });

    it('should apply total order discount after item discounts', async () => {
      const items = [
        {
          productId: 'prod-pizza', // Tiene descuento de $50
          quantity: 1,
          customizations: { added: [], removed: [] }
        },
        {
          productId: 'prod-hamburguesa',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Pizza: 200 - 50 (descuento producto) = 150
      // Hamburguesa: 80
      // Subtotal después de descuentos de item: 230
      // Descuento total 10%: 230 * 0.10 = 23
      // Total final: 230 - 23 = 207
      expect(res.body.summary.totalFinal).toBeCloseTo(207.00, 2);

      // Verificar que ambas promociones se aplicaron
      expect(res.body.items[0].appliedPromotion).toBeDefined();
      expect(res.body.summary.appliedOrderPromotion).toBeDefined();
    });
  });

  // TEST 5: Carrito mixto (productos + paquetes + promociones)
  describe('Mixed cart (products + packages + promotions)', () => {
    it('should calculate correctly with packages and regular products', async () => {
      const items = [
        {
          packageId: 'package-familiar',
          quantity: 1,
          packageCustomizations: {}
        },
        {
          productId: 'prod-ensalada',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Paquete: 120
      // Ensalada: 90
      // Subtotal: 210
      // Descuento total 10%: 21
      // Total: 189
      expect(res.body.summary.totalFinal).toBeCloseTo(189.00, 2);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].type).toBe('package');
      expect(res.body.items[1].type).toBe('product');
    });

    it('should handle complex scenario: packages + products with discounts + total order discount', async () => {
      const items = [
        // Paquete con extras
        {
          packageId: 'package-familiar',
          quantity: 1,
          packageCustomizations: {
            'prod-hamburguesa': {
              added: ['Queso Extra'],
              removed: []
            }
          }
        },
        // Pizza con descuento de $50
        {
          productId: 'prod-pizza',
          quantity: 1,
          customizations: { added: [], removed: [] }
        },
        // Refresco con descuento del 20%
        {
          productId: 'prod-refresco',
          quantity: 2,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Cálculos:
      // 1. Paquete: 120 + Queso (15) = 135
      // 2. Pizza: 200 - 50 (descuento) = 150
      // 3. Refresco: (25 * 2) - (50 * 0.20) = 50 - 10 = 40
      // Subtotal: 135 + 150 + 40 = 325
      // Descuento total 10%: 325 * 0.10 = 32.5
      // Total final: 325 - 32.5 = 292.5
      expect(res.body.summary.totalFinal).toBeCloseTo(292.50, 2);

      expect(res.body.items).toHaveLength(3);
      expect(res.body.summary.appliedOrderPromotion).toBeDefined();
    });

    it('should calculate IVA correctly with mixed cart', async () => {
      const items = [
        {
          productId: 'prod-hamburguesa',
          quantity: 1,
          customizations: { added: [], removed: [] }
        },
        {
          productId: 'prod-refresco', // No taxable
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Verificar que el IVA está calculado
      expect(res.body.summary).toHaveProperty('ivaDesglosado');
      expect(res.body.summary.ivaDesglosado).toBeGreaterThan(0);

      // IVA = Total - Subtotal
      const expectedIva = res.body.summary.totalFinal - res.body.summary.subtotalGeneral;
      expect(res.body.summary.ivaDesglosado).toBeCloseTo(expectedIva, 2);
    });
  });

  // TEST 6: Validaciones y casos de error
  describe('Error handling and validations', () => {
    it('should return 400 if items array is missing', async () => {
      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('array of items');
    });

    it('should return 400 if item has neither productId nor packageId', async () => {
      const items = [
        {
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('productId or packageId');
    });

    it('should return 400 if product does not exist', async () => {
      const items = [
        {
          productId: 'prod-non-existent',
          quantity: 1,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('no encontrado');
    });

    it('should handle corrupted item gracefully', async () => {
      const items = [
        {
          productId: 'prod-hamburguesa'
          // Falta quantity
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(400);
    });
  });

  // TEST 7: Performance y casos edge
  describe('Edge cases', () => {
    it('should handle empty cart (empty items array)', async () => {
      const items = [];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.summary.totalFinal).toBe(0);
      expect(res.body.summary.subtotalGeneral).toBe(0);
    });

    it('should handle large quantity', async () => {
      const items = [
        {
          productId: 'prod-refresco',
          quantity: 100,
          customizations: { added: [], removed: [] }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Refresco: 25 * 100 = 2500
      // Descuento 20%: 500
      // Subtotal: 2000
      // Descuento total 10%: 200
      // Total: 1800
      expect(res.body.summary.totalFinal).toBeCloseTo(1800.00, 2);
    });

    it('should ignore non-existent extras in customizations', async () => {
      const items = [
        {
          productId: 'prod-hamburguesa',
          quantity: 1,
          customizations: {
            added: ['Extra Inexistente'],
            removed: []
          }
        }
      ];

      const res = await request(app)
        .post('/api/cart/verify-totals')
        .set('Authorization', 'Bearer test-token')
        .send({ items });

      expect(res.statusCode).toBe(200);

      // Debe calcular como si no tuviera extras
      expect(res.body.summary.totalFinal).toBeCloseTo(72.00, 2); // 80 - 10% = 72
    });
  });
});
