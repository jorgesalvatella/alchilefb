import { render, screen, waitFor } from '@testing-library/react';
import { getAuth } from 'firebase/auth';
import { notFound } from 'next/navigation';

// Mock Firestore
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

// Mock useFirestore
jest.mock('@/firebase/provider', () => ({
  useFirestore: jest.fn(() => ({
    collection: jest.fn()
  })),
}));

// Mock withAuth to return the component directly with a mock user
jest.mock('@/firebase/withAuth', () => ({
  withAuth: (Component: any) => {
    return function MockedComponent(props: any) {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@test.com',
        getIdToken: jest.fn(() => Promise.resolve('test-token')),
      };
      const mockClaims = {};
      return <Component {...props} user={mockUser} claims={mockClaims} />;
    };
  },
}));

// Import OrderTrackingPage AFTER mocking withAuth
let OrderTrackingPage: any;

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    },
  })),
}));

const { notFound: mockNotFound, useParams: mockUseParams } = jest.requireMock('next/navigation');

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  useParams: jest.fn(() => ({ id: 'order-123' })),
}));

global.fetch = jest.fn();

const mockFetch = global.fetch as jest.Mock;

describe('OrderTrackingPage', () => {

  beforeAll(() => {
    // Import OrderTrackingPage after all mocks are set up
    OrderTrackingPage = require('./page').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockOnSnapshot.mockClear();
    mockDoc.mockReturnValue({});
  });

  afterEach(() => {
    // Cleanup any pending timers
    jest.clearAllTimers();
  });

  it('should call notFound() if order is not found (404)', async () => {
    // Mock onSnapshot para retornar que el documento no existe
    const unsubscribe = jest.fn();
    mockOnSnapshot.mockImplementation((docRef, successCallback) => {
      const mockDocSnapshot = {
        exists: () => false,
      };
      // Call callback synchronously to avoid timing issues
      setTimeout(() => successCallback(mockDocSnapshot), 0);
      return unsubscribe; // unsubscribe function
    });

    render(<OrderTrackingPage />);

    await waitFor(() => {
      expect(mockNotFound).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify unsubscribe was created
    expect(mockOnSnapshot).toHaveBeenCalled();
  }, 10000);

  it('should display order details when data is fetched successfully', async () => {
    const mockOrder = {
      id: 'order-123',
      status: 'Preparando',
      totalVerified: 150.0,
      subtotalVerified: 129.31,
      taxVerified: 20.69,
      createdAt: { _seconds: 1672617600, _nanoseconds: 0 },
      items: [
        { name: 'Taco', quantity: 2, totalItem: 50 },
        { name: 'Quesadilla', quantity: 1, totalItem: 100 },
      ],
      shippingAddress: {
        formattedAddress: '123 Main St, Anytown, USA'
      },
      userId: 'test-user-123',
    };

    // Mock onSnapshot para retornar el pedido
    const unsubscribe = jest.fn();
    mockOnSnapshot.mockImplementation((docRef, successCallback) => {
      const mockDocSnapshot = {
        exists: () => true,
        data: () => mockOrder,
        id: 'order-123',
      };
      // Call callback synchronously to avoid timing issues
      setTimeout(() => successCallback(mockDocSnapshot), 0);
      return unsubscribe; // unsubscribe function
    });

    render(<OrderTrackingPage />);

    // Usar findBy* que ya viene con waitFor incorporado con timeout
    expect(await screen.findByText(/Rastrea Tu Pedido/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText(/¡El pedido #order-123 está en camino!/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText('Artículos del Pedido', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText('2 x Taco', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText('1 x Quesadilla', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText('$129.31', {}, { timeout: 3000 })).toBeInTheDocument(); // Subtotal
    expect(await screen.findByText('$20.69', {}, { timeout: 3000 })).toBeInTheDocument();  // IVA
    expect(await screen.findByText('$150.00', {}, { timeout: 3000 })).toBeInTheDocument(); // Total

    // Verify unsubscribe was created
    expect(mockOnSnapshot).toHaveBeenCalled();
  }, 10000);
});
