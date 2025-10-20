import { render, screen, waitFor } from '@testing-library/react';
import { getAuth } from 'firebase/auth';

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
  });

  it('should display empty state if user has no orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Aún no tienes pedidos')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Ver el Menú/i })).toBeInTheDocument();
    });
  });

  it('should display a list of orders for an authenticated user', async () => {
    const mockOrders = [
      { id: 'order1', status: 'Entregado', totalVerified: 100, createdAt: { _seconds: 1672531200 } },
      { id: 'order2', status: 'En Reparto', totalVerified: 150, createdAt: { _seconds: 1672617600 } },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockOrders),
    });

    render(<OrdersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Pedido #order1/i)).toBeInTheDocument();
      expect(screen.getByText(/Pedido #order2/i)).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/me/orders', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API is down'));

    render(<OrdersPage />);

    await waitFor(() => {
      // En caso de error, el estado de pedidos se setea a [], mostrando el estado vacío.
      expect(screen.getByText('Aún no tienes pedidos')).toBeInTheDocument();
    });
  });
});
