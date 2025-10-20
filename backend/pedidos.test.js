const request = require('supertest');
const app = require('./app');
const admin = require('firebase-admin');

// Mock completo de firebase-admin
jest.mock('firebase-admin', () => {
  const mockProducts = {
    'prod1': { price: 10, name: 'Taco' },
    'prod2': { price: 5, name: 'Agua' },
  };

  const mockDocGet = jest.fn((docId) => {
    const product = mockProducts[docId];
    return Promise.resolve({
      exists: !!product,
      data: () => product,
    });
  });

  const mockAdd = jest.fn();

  // Mock de query builder para soportar .where().orderBy().get()
  const createQueryMock = (collectionName) => {
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

  const firestore = jest.fn(() => ({
    collection: jest.fn((collectionName) => {
      if (collectionName === 'productosDeVenta') {
        return {
          doc: (docId) => ({
            get: () => mockDocGet(docId),
          }),
        };
      }
      // Para otras colecciones, retornar query mock + add/doc
      return {
        ...createQueryMock(collectionName),
        add: mockAdd,
        doc: (docId) => ({
          get: () => Promise.resolve({ exists: false }),
          update: jest.fn()
        }),
      };
    }),
  }));

  // Correctly mock FieldValue so 'instanceof' works
  function MockFieldValue() {}
  MockFieldValue.serverTimestamp = jest.fn(() => new MockFieldValue());
  firestore.FieldValue = MockFieldValue;

  return {
    initializeApp: jest.fn(),
    firestore,
    auth: () => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user-id' }),
    }),
    mockDocGet,
    mockAdd,
  };
});

// Mock del middleware de autenticación
jest.mock('./authMiddleware', () => jest.fn((req, res, next) => {
  req.user = { uid: 'test-user-id' };
  next();
}));

describe('POST /api/pedidos', () => {
  const { mockDocGet, mockAdd } = admin;

  beforeEach(() => {
    // Limpiamos los mocks antes de cada prueba
    mockDocGet.mockClear();
    mockAdd.mockClear();
  });

  it('should create an order successfully with valid data', async () => {
    // Datos de entrada del cliente
    const clientPayload = {
      items: [
        { id: 'prod1', name: 'Taco', price: 10, quantity: 2 },
        { id: 'prod2', name: 'Agua', price: 5, quantity: 1 },
      ],
      shippingAddress: { street: 'Av. Siempre Viva 123', city: 'Springfield' },
      paymentMethod: 'Efectivo',
    };

    // Simulamos que la verificación de precios no altera los datos en este caso simple
    // (En un test más avanzado, simularíamos la lógica de verifyCartTotals)

    // Simulamos la respuesta de Firestore al añadir el documento
    mockAdd.mockResolvedValue({ 
      id: 'new-order-123',
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          ...clientPayload,
          userId: 'test-user-id',
          totalVerified: 25,
          status: 'Recibido',
        }),
      }),
    });

    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer valid-token')
      .send(clientPayload);

    // Verificaciones
    expect(res.statusCode).toBe(201);
    expect(res.body.id).toBe('new-order-123');
    expect(res.body.status).toBe('Pedido Realizado');
    expect(res.body.userId).toBe('test-user-id');
    expect(res.body.totalVerified).toBe(25); // 2*10 + 5

    // Verificamos que se llamó a la función 'add' de Firestore con los datos correctos
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'test-user-id',
      totalVerified: 25,
      paymentMethod: 'Efectivo',
    }));
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', 'Bearer valid-token')
      .send({ items: [] }); // Payload inválido

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Faltan campos requeridos');
  });

  // TODO: Añadir más casos de prueba:
  // 1. Un test que envíe un 'total' desde el cliente y verifique que es ignorado
  //    y recalculado correctamente por el backend.
  // 2. Un test que simule una falla en la base de datos y verifique que se retorna un 500.
  // 3. Un test para cada tipo de 'shippingAddress' (objeto, 'whatsapp', URL).

});
