import { render, screen, waitFor } from '@testing-library/react';
import { getAuth } from 'firebase/auth';
import { notFound } from 'next/navigation';

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
  });

  // This test is not applicable anymore because withAuth handles loading
  it.skip('should render loading skeletons initially', () => {
    // withAuth handles loading state
  });

  it('should call notFound() if order is not found (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<OrderTrackingPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/me/orders/order-123', expect.any(Object));
      expect(mockNotFound).toHaveBeenCalled();
    });
  });

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
      }
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockOrder),
    });

    render(<OrderTrackingPage />);

    // Usar findBy* que ya viene con waitFor incorporado
    expect(await screen.findByText(/Rastrea Tu Pedido/i)).toBeInTheDocument();
    expect(await screen.findByText(/¡El pedido #order-123 está en camino!/i)).toBeInTheDocument();
    expect(await screen.findByText('Artículos del Pedido')).toBeInTheDocument();
    expect(await screen.findByText('2 x Taco')).toBeInTheDocument();
    expect(await screen.findByText('1 x Quesadilla')).toBeInTheDocument();
    expect(await screen.findByText('$129.31')).toBeInTheDocument(); // Subtotal
    expect(await screen.findByText('$20.69')).toBeInTheDocument();  // IVA
    expect(await screen.findByText('$150.00')).toBeInTheDocument(); // Total
  });
});
