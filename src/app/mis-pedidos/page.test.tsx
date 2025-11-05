import { render, screen, waitFor } from '@testing-library/react';
import { getAuth } from 'firebase/auth';

// Mock Firestore
const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

// Mock useFirestore
jest.mock('@/firebase/provider', () => ({
  useFirestore: jest.fn(() => ({
    collection: mockCollection
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

// Import OrdersPage AFTER mocking withAuth
let OrdersPage: any;

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    },
  })),
}));

// Mock de fetch global
global.fetch = jest.fn();

const mockGetAuth = getAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('OrdersPage', () => {
  beforeAll(() => {
    // Import OrdersPage after all mocks are set up
    OrdersPage = require('./page').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockOnSnapshot.mockClear();
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
  });

  afterEach(() => {
    // Cleanup any pending timers
    jest.clearAllTimers();
  });

  it('should display empty state if user has no orders', async () => {
    // Mock onSnapshot para retornar pedidos vacíos
    const unsubscribe = jest.fn();
    mockOnSnapshot.mockImplementation((query, successCallback) => {
      const mockQuerySnapshot = {
        forEach: (callback: any) => {
          // No hay pedidos
        },
      };
      // Call callback synchronously to avoid timing issues
      setTimeout(() => successCallback(mockQuerySnapshot), 0);
      return unsubscribe; // unsubscribe function
    });

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Aún no tienes pedidos')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ver el Menú/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify unsubscribe was created
    expect(mockOnSnapshot).toHaveBeenCalled();
  }, 10000);

  it('should display a list of orders for an authenticated user', async () => {
    const mockOrders = [
      { id: 'order1', status: 'Entregado', totalVerified: 100, createdAt: { _seconds: 1672531200 }, userId: 'test-user-123' },
      { id: 'order2', status: 'En Reparto', totalVerified: 150, createdAt: { _seconds: 1672617600 }, userId: 'test-user-123' },
    ];

    // Mock onSnapshot para retornar los pedidos
    const unsubscribe = jest.fn();
    mockOnSnapshot.mockImplementation((query, successCallback) => {
      const mockQuerySnapshot = {
        forEach: (callback: any) => {
          mockOrders.forEach(order => {
            callback({
              data: () => order,
              id: order.id,
            });
          });
        },
      };
      // Call callback synchronously to avoid timing issues
      setTimeout(() => successCallback(mockQuerySnapshot), 0);
      return unsubscribe; // unsubscribe function
    });

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Pedido #order1/i)).toBeInTheDocument();
      expect(screen.getByText(/Pedido #order2/i)).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify unsubscribe was created
    expect(mockOnSnapshot).toHaveBeenCalled();
  }, 10000);

  it('should handle fetch errors gracefully', async () => {
    // Mock onSnapshot para retornar error
    const unsubscribe = jest.fn();
    mockOnSnapshot.mockImplementation((query, successCallback, errorCallback) => {
      // Call error callback synchronously to avoid timing issues
      setTimeout(() => errorCallback(new Error('Firestore error')), 0);
      return unsubscribe; // unsubscribe function
    });

    render(<OrdersPage />);

    await waitFor(() => {
      // En caso de error, el estado de pedidos se setea a [], mostrando el estado vacío.
      expect(screen.getByText('Aún no tienes pedidos')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify unsubscribe was created
    expect(mockOnSnapshot).toHaveBeenCalled();
  }, 10000);
});
