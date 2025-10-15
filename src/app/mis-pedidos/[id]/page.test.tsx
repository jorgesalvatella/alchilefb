import { render, screen, waitFor } from '@testing-library/react';
import OrderTrackingPage from './page';
import { useUser } from '@/firebase/provider';
import { getAuth } from 'firebase/auth';
import { notFound } from 'next/navigation';

// Mocks
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    },
  })),
}));

jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockFetch = global.fetch as jest.Mock;
const mockNotFound = notFound as jest.Mock;

// Mock del hook 'use' de React para que funcione con Jest
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    use: (promise: Promise<any>) => {
      // Para este test, sabemos que la promesa se resuelve a { id: 'order-123' }
      // Devolvemos ese valor directamente para simular el comportamiento del hook.
      return { id: 'order-123' };
    },
  };
});

describe('OrderTrackingPage', () => {
  const mockParams = Promise.resolve({ id: 'order-123' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should render loading skeletons initially', () => {
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: true });
    render(<OrderTrackingPage params={mockParams} />);
    // Check for the presence of skeleton elements via data-testid
    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should call notFound() if order is not found (404)', async () => {
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<OrderTrackingPage params={mockParams} />);

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
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockOrder),
    });

    render(<OrderTrackingPage params={mockParams} />);

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
