// Polyfill for TextEncoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock firebase-admin initialization for tests
const mockFirestore = {
  collection: jest.fn(() => mockFirestore),
  doc: jest.fn(() => mockFirestore),
  get: jest.fn(() => ({ exists: false, data: jest.fn(() => ({})) })),
  update: jest.fn(),
  set: jest.fn(),
  where: jest.fn(() => mockFirestore),
  limit: jest.fn(() => mockFirestore),
  FieldValue: {
    serverTimestamp: jest.fn(),
    arrayUnion: jest.fn(),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn(() => ({ toDate: () => new Date() })),
  },
};

const mockAuth = {
  verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-user-uid', repartidor: true })),
};

jest.mock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(() => mockFirestore),
    doc: jest.fn(() => mockFirestore),
    get: jest.fn(() => ({ exists: false, data: jest.fn(() => ({})) })),
    update: jest.fn(),
    set: jest.fn(),
    where: jest.fn(() => mockFirestore),
    limit: jest.fn(() => mockFirestore),
    FieldValue: {
      serverTimestamp: jest.fn(),
      arrayUnion: jest.fn(),
    },
    Timestamp: {
      now: jest.fn(() => ({ toDate: () => new Date() })),
      fromDate: jest.fn(() => ({ toDate: () => new Date() })),
    },
  };

  const mockAuth = {
    verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-user-uid', repartidor: true })),
    getUser: jest.fn(() => Promise.resolve({ uid: 'test-user-id', customClaims: { admin: true } })),
  };

  return {
    initializeApp: jest.fn(),
    firestore: jest.fn(() => mockFirestore),
    auth: jest.fn(() => mockAuth),
  };
});
