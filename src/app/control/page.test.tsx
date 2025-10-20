import { render, screen } from '@testing-library/react';
import { useCollection } from '@/firebase/firestore/use-collection';

// Mock withAuth to return the component directly with a mock user
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

// Import AdminDashboardPage AFTER mocking withAuth
let AdminDashboardPage: any;

// Mock del hook useCollection
jest.mock('@/firebase/firestore/use-collection');

// Mock de los hooks de Firebase provider para evitar errores
jest.mock('@/firebase/provider', () => ({
  useFirestore: jest.fn(),
  useMemoFirebase: jest.fn((callback) => callback()),
}));

const mockUseCollection = useCollection as jest.Mock;

describe('AdminDashboardPage', () => {
  beforeAll(() => {
    // Import AdminDashboardPage after all mocks are set up
    AdminDashboardPage = require('./page').default;
  });

  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    mockUseCollection.mockClear();
  });

  it('should render loading state correctly', () => {
    // Simular estado de carga para ambas colecciones
    mockUseCollection.mockReturnValue({ data: null, isLoading: true });
    
    // Renderizar la página (aunque no muestra skeletons explícitos, podemos verificar que no muestra datos)
    render(<AdminDashboardPage />);
    
    // Verificar que los valores iniciales (o de carga) son 0
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    // Ambas tarjetas "Nuevos Pedidos" y "Nuevos Clientes" muestran +0
    const newItems = screen.getAllByText('+0');
    expect(newItems).toHaveLength(2);
    expect(screen.getByText('0')).toBeInTheDocument(); // Productos
  });

  it('should render cards with correct data when loaded', () => {
    const mockOrders = [
      { id: '1', totalAmount: 100, userId: 'user1' },
      { id: '2', totalAmount: 150, userId: 'user2' },
      { id: '3', totalAmount: 50, userId: 'user1' }, // Cliente repetido
    ];
    const mockMenuItems = [
      { id: 'item1' }, { id: 'item2' },
    ];

    // Configurar mocks para devolver datos
    mockUseCollection
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }) // Para orders
      .mockReturnValueOnce({ data: mockMenuItems, isLoading: false }); // Para menu_items

    render(<AdminDashboardPage />);

    // Verificar Ingresos Totales (100 + 150 + 50 = 300)
    expect(screen.getByText('$300.00')).toBeInTheDocument();
    // Verificar Nuevos Pedidos (3)
    expect(screen.getByText('+3')).toBeInTheDocument();
    // Verificar Nuevos Clientes (user1, user2 -> 2)
    expect(screen.getByText('+2')).toBeInTheDocument();
    // Verificar Productos en Stock (2)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render zero values when there is no data', () => {
    // Simular que no hay datos y la carga ha terminado
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });

    render(<AdminDashboardPage />);

    // Verificar que todos los valores son 0
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getAllByText('+0').length).toBe(2); // Nuevos Pedidos y Nuevos Clientes
    expect(screen.getByText('0')).toBeInTheDocument(); // Productos
  });

  it('should render card titles correctly', () => {
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });
    render(<AdminDashboardPage />);

    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument();
    expect(screen.getByText('Nuevos Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Nuevos Clientes')).toBeInTheDocument();
    expect(screen.getByText('Productos en Stock')).toBeInTheDocument();
  });
});
