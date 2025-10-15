import { render, screen, waitFor } from '@testing-library/react';
import OrdersPage from './page';
import { useUser } from '@/firebase/provider';
import { getAuth } from 'firebase/auth';

// Mock a nivel de módulo
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('test-token'), // Corregido aquí
    },
  })),
}));

// Mock de fetch global
global.fetch = jest.fn();

const mockUseUser = useUser as jest.Mock;
const mockGetAuth = getAuth as jest.Mock;
const mockFetch = global.fetch as jest.Mock;

describe('OrdersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should render loading skeletons when user is loading', () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: true });
    render(<OrdersPage />);
    // Durante la carga, el título principal puede no estar visible,
    // pero los esqueletos sí. Verificamos que el contenido final no esté.
    expect(screen.queryByText('Aún no tienes pedidos')).not.toBeInTheDocument();
    expect(screen.queryByText('Inicia Sesión para Ver tus Pedidos')).not.toBeInTheDocument();
  });

  it('should prompt to login if user is not authenticated', async () => {
    mockUseUser.mockReturnValue({ user: null, isUserLoading: false });
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Inicia Sesión para Ver tus Pedidos')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Iniciar Sesión/i })).toBeInTheDocument();
    });
  });

  it('should display empty state if user has no orders', async () => {
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    (mockGetAuth().currentUser.getIdToken as jest.Mock).mockResolvedValue('test-token');
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
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    (mockGetAuth().currentUser.getIdToken as jest.Mock).mockResolvedValue('test-token');
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
    mockUseUser.mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    (mockGetAuth().currentUser.getIdToken as jest.Mock).mockResolvedValue('test-token');
    mockFetch.mockRejectedValueOnce(new Error('API is down'));

    render(<OrdersPage />);

    await waitFor(() => {
      // En caso de error, el estado de pedidos se setea a [], mostrando el estado vacío.
      expect(screen.getByText('Aún no tienes pedidos')).toBeInTheDocument();
    });
  });
});
