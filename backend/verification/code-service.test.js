// IMPORTANTE: Mock debe estar ANTES de cualquier require
let mockCodesDb = {};
let codeCounter = 0;

const mockTimestamp = {
  now: jest.fn(() => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000)
  })),
  fromDate: jest.fn((date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000)
  }))
};

const mockFieldValue = {
  serverTimestamp: jest.fn(() => new Date())
};

const createQueryMock = () => {
  const conditions = {
    userId: null,
    verified: null,
    invalidated: null,
    expiresAt: { operator: null, value: null }
  };

  const queryMock = {
    where: jest.fn((field, operator, value) => {
      if (field === 'userId') conditions.userId = value;
      if (field === 'verified') conditions.verified = value;
      if (field === 'invalidated') conditions.invalidated = value;
      if (field === 'expiresAt') {
        conditions.expiresAt.operator = operator;
        conditions.expiresAt.value = value;
      }
      return queryMock;
    }),
    orderBy: jest.fn(() => queryMock),
    limit: jest.fn(() => queryMock),
    get: jest.fn(() => {
      const docs = Object.entries(mockCodesDb)
        .filter(([id, code]) => {
          if (conditions.userId && code.userId !== conditions.userId) return false;
          if (conditions.verified !== null && code.verified !== conditions.verified) return false;
          if (conditions.invalidated !== null && code.invalidated !== conditions.invalidated) return false;
          if (conditions.expiresAt.operator === '>') {
            const codeExpiry = code.expiresAt.toDate().getTime();
            const checkTime = conditions.expiresAt.value.toDate().getTime();
            if (codeExpiry <= checkTime) return false;
          }
          if (conditions.expiresAt.operator === '<') {
            const codeCreated = code.createdAt.getTime();
            const checkTime = conditions.expiresAt.value.toDate().getTime();
            if (codeCreated >= checkTime) return false;
          }
          return true;
        })
        .map(([id, code]) => ({
          id,
          data: () => code,
          ref: {
            update: jest.fn((updates) => {
              mockCodesDb[id] = { ...mockCodesDb[id], ...updates };
              return Promise.resolve();
            }),
            delete: jest.fn(() => {
              delete mockCodesDb[id];
              return Promise.resolve();
            })
          }
        }));

      return Promise.resolve({
        empty: docs.length === 0,
        docs,
        size: docs.length,
        forEach: (callback) => docs.forEach(callback)
      });
    })
  };

  return queryMock;
};

const firestoreInstance = {
  collection: (collectionName) => ({
    add: jest.fn((data) => {
      const id = `code_${++codeCounter}`;
      mockCodesDb[id] = data;
      return Promise.resolve({ id });
    }),
    doc: (docId) => ({
      get: jest.fn(() => Promise.resolve({
        exists: !!mockCodesDb[docId],
        id: docId,
        data: () => mockCodesDb[docId]
      })),
      update: jest.fn((updates) => {
        if (mockCodesDb[docId]) {
          mockCodesDb[docId] = { ...mockCodesDb[docId], ...updates };
        }
        return Promise.resolve();
      }),
      delete: jest.fn(() => {
        delete mockCodesDb[docId];
        return Promise.resolve();
      })
    }),
    where: (field, operator, value) => createQueryMock().where(field, operator, value)
  }),
  batch: () => {
    const operations = [];
    return {
      update: (ref, data) => operations.push({ type: 'update', ref, data }),
      delete: (ref) => operations.push({ type: 'delete', ref }),
      commit: jest.fn(() => {
        operations.forEach(op => {
          if (op.type === 'update' && op.ref.update) {
            op.ref.update(op.data);
          } else if (op.type === 'delete' && op.ref.delete) {
            op.ref.delete();
          }
        });
        return Promise.resolve();
      })
    };
  }
};

jest.mock('firebase-admin', () => {
  const firestoreFn = jest.fn(() => firestoreInstance);
  firestoreFn.FieldValue = mockFieldValue;
  firestoreFn.Timestamp = mockTimestamp;

  return {
    firestore: firestoreFn,
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn()
    }
  };
});

const codeService = require('./code-service');

describe('Code Service', () => {

  beforeEach(() => {
    // Limpiar base de datos mock
    mockCodesDb = {};
    codeCounter = 0;
    jest.clearAllMocks();
  });

  describe('generateCode', () => {
    it('debe generar un código de 6 dígitos', () => {
      const code = codeService.generateCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('debe generar códigos únicos', () => {
      const code1 = codeService.generateCode();
      const code2 = codeService.generateCode();
      const code3 = codeService.generateCode();

      const codes = new Set([code1, code2, code3]);
      expect(codes.size).toBeGreaterThan(1);
    });

    it('debe generar números dentro del rango 100000-999999', () => {
      const code = codeService.generateCode();
      const num = parseInt(code);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    });
  });

  describe('createVerificationCode', () => {
    it('debe crear un nuevo código de verificación', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const result = await codeService.createVerificationCode(userId, phoneNumber);

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('codeId');
      expect(result.code).toHaveLength(6);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('debe crear código que expire en 10 minutos', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const beforeCreate = Date.now();
      const result = await codeService.createVerificationCode(userId, phoneNumber);
      const afterCreate = Date.now();

      const expectedExpiry = beforeCreate + 10 * 60 * 1000;
      const actualExpiry = result.expiresAt.getTime();

      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(actualExpiry).toBeLessThanOrEqual(afterCreate + 10 * 60 * 1000 + 1000);
    });

    it('debe invalidar códigos anteriores del usuario', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const result1 = await codeService.createVerificationCode(userId, phoneNumber);
      const result2 = await codeService.createVerificationCode(userId, phoneNumber);

      const activeCode = await codeService.getActiveCode(userId);
      expect(activeCode.code).toBe(result2.code);
      expect(activeCode.code).not.toBe(result1.code);
    });
  });

  describe('getActiveCode', () => {
    it('debe retornar null si no hay códigos activos', async () => {
      const userId = 'user123';
      const activeCode = await codeService.getActiveCode(userId);
      expect(activeCode).toBeNull();
    });

    it('debe retornar el código activo del usuario', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);
      const active = await codeService.getActiveCode(userId);

      expect(active).not.toBeNull();
      expect(active.code).toBe(created.code);
      expect(active.attempts).toBe(0);
    });

    it('debe retornar null si el código está verificado', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);
      await codeService.verifyCode(userId, created.code);

      const active = await codeService.getActiveCode(userId);
      expect(active).toBeNull();
    });

    it('debe retornar null si el código está invalidado', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);
      await codeService.invalidateCode(created.codeId);

      const active = await codeService.getActiveCode(userId);
      expect(active).toBeNull();
    });
  });

  describe('verifyCode', () => {
    it('debe verificar código correcto exitosamente', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);
      const result = await codeService.verifyCode(userId, created.code);

      expect(result.success).toBe(true);
    });

    it('debe rechazar código incorrecto', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      await codeService.createVerificationCode(userId, phoneNumber);
      const result = await codeService.verifyCode(userId, '999999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_code');
      expect(result.attemptsRemaining).toBe(2);
    });

    it('debe retornar error si no hay código activo', async () => {
      const userId = 'user123';
      const result = await codeService.verifyCode(userId, '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('no_active_code');
    });

    it('debe incrementar intentos en código incorrecto', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      await codeService.createVerificationCode(userId, phoneNumber);

      const result1 = await codeService.verifyCode(userId, '111111');
      expect(result1.attemptsRemaining).toBe(2);

      const result2 = await codeService.verifyCode(userId, '222222');
      expect(result2.attemptsRemaining).toBe(1);

      const result3 = await codeService.verifyCode(userId, '333333');
      expect(result3.attemptsRemaining).toBe(0);
    });

    it('debe invalidar código después de 3 intentos fallidos', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);

      await codeService.verifyCode(userId, '111111');
      await codeService.verifyCode(userId, '222222');
      await codeService.verifyCode(userId, '333333');

      // Cuarto intento debe retornar max_attempts_exceeded
      const result4 = await codeService.verifyCode(userId, created.code);
      expect(result4.success).toBe(false);
      expect(result4.error).toBe('max_attempts_exceeded');
    });

    it('debe permitir verificación exitosa antes de 3 intentos', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);

      await codeService.verifyCode(userId, '111111');
      await codeService.verifyCode(userId, '222222');

      const result3 = await codeService.verifyCode(userId, created.code);
      expect(result3.success).toBe(true);
    });
  });

  describe('invalidateCode', () => {
    it('debe invalidar un código específico', async () => {
      const userId = 'user123';
      const phoneNumber = '+525512345678';

      const created = await codeService.createVerificationCode(userId, phoneNumber);
      await codeService.invalidateCode(created.codeId);

      const active = await codeService.getActiveCode(userId);
      expect(active).toBeNull();
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('debe retornar número de códigos eliminados', async () => {
      const result = await codeService.cleanupExpiredCodes();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
