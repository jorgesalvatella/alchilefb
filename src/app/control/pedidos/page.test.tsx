import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Order } from '@/lib/types';
import { useUser } from '@/firebase/provider';

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/control/pedidos'),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock de withAuth
jest.mock('@/firebase/withAuth', () => ({
  withAuth: (Component: any) => {
    return function MockedComponent(props: any) {
      const mockUser = {
        uid: 'test-admin-123',
        email: 'admin@test.com',
        getIdToken: jest.fn(() => Promise.resolve('test-token')),
      };
      const mockClaims = { admin: true };
      return <Component {...props} user={mockUser} claims={mockClaims} />;
    };
  },
}));

// Mock del hook useUser
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

// Mock de sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockUser = {
  uid: 'admin-user-id',
  getIdToken: async () => 'fake-token',
};

const mockOrders: Order[] = [
  { id: 'ORDER-001', status: 'Preparando', userName: 'Cliente 1', totalVerified: 100, createdAt: new Date() },
  { id: 'ORDER-002', status: 'En Reparto', userName: 'Cliente 2', totalVerified: 150, createdAt: new Date() },
];

const mockDetailedOrder: Order = {
  ...mockOrders[0],
  items: [{ id: 'item-1', name: 'Taco de Test', quantity: 2, price: 50 }],
  statusHistory: [{ status: 'Pedido Realizado', timestamp: new Date() }],
};

const mockStats = {
  todayOrders: 5,
  todayOrdersChange: 10, // +10% vs yesterday
  activeOrders: 2,
  activeOrdersByStatus: {
    'Preparando': 1,
    'En Reparto': 1,
  },
  todayRevenue: 500.75,
  averageTicket: 100.15,
  averageDeliveryTime: 25,
  deliveryTimeUnit: 'min',
};

global.fetch = jest.fn();

let AdminOrdersPage: any;

describe('AdminOrdersPage Integration', () => {
  beforeAll(() => {
    AdminOrdersPage = require('./page').default;
  });

  beforeEach(() => {
    (useUser as jest.Mock).mockReturnValue({ user: mockUser, isUserLoading: false });
    (fetch as jest.Mock).mockClear();

    // Mockear respuestas por defecto
    (fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/pedidos/control/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });
      }
      if (url.includes('/api/pedidos/control?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ orders: mockOrders }),
        });
      }
      if (url.includes('/api/pedidos/control/ORDER-001')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ order: mockDetailedOrder }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it('should render, fetch, and display orders and stats', async () => {
    render(<AdminOrdersPage />);

    // Verificar que se muestran los esqueletos de carga inicialmente
    const skeletons = await screen.findAllByTestId('loading-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    
    // Esperar a que los datos se carguen y se muestren
    await waitFor(() => {
      expect(screen.getByText('Hub de Pedidos')).toBeInTheDocument();
      // Verificar KPI
      expect(screen.getByText('Pedidos Hoy')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      // Verificar tabla
      expect(screen.getByText('Cliente 1')).toBeInTheDocument();
      expect(screen.getByText('Cliente 2')).toBeInTheDocument();
    });
  });

  it('should refetch orders when a status filter is clicked', async () => {
    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Cliente 1')).toBeInTheDocument();
    });

    // Limpiar el mock para la nueva aserción
    (fetch as jest.Mock).mockClear();

    // Acotar la búsqueda al componente de filtros para evitar ambigüedad
    const filtersContainer = screen.getByTestId('orders-filters-container');
    const preparandoFilter = within(filtersContainer).getByText('Preparando');
    fireEvent.click(preparandoFilter);

    await waitFor(() => {
      // Verificar que se llamó a fetch con los nuevos parámetros
      const fetchCall = (fetch as jest.Mock).mock.calls.find(call => call[0].includes('/api/pedidos/control?'));
      expect(fetchCall[0]).toContain('status=Preparando');
    });
  });

  it('should open the details sheet when a view button is clicked', async () => {
    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Cliente 1')).toBeInTheDocument();
    });

    // Encontrar el botón "Ver" en la fila del Cliente 1
    const cliente1Row = screen.getByText('Cliente 1').closest('tr');
    const viewButton = within(cliente1Row!).getByRole('button', { name: /Ver/i });
    
    fireEvent.click(viewButton);

    await waitFor(() => {
      // Verificar que el Sheet se abrió con los detalles correctos
      expect(screen.getByText(/Pedido #ER-001/)).toBeInTheDocument(); // Corregido: slice(-6) de ORDER-001 es ER-001
      expect(screen.getByText('Información del Cliente')).toBeInTheDocument();
    });
  });
});
