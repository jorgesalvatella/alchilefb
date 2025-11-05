import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Timestamp } from 'firebase/firestore';

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

// Mock de recharts para evitar errores de renderizado
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
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
    // Simular estado de carga para todas las colecciones
    mockUseCollection.mockReturnValue({ data: null, isLoading: true });

    render(<AdminDashboardPage />);

    // Verificar que muestra los títulos de KPIs
    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Gastos')).toBeInTheDocument();
    expect(screen.getByText('Ganancia')).toBeInTheDocument();
    expect(screen.getByText('Margen')).toBeInTheDocument();

    // Verificar estados de carga
    const loadingIndicators = screen.getAllByText('...');
    expect(loadingIndicators.length).toBeGreaterThan(0);
  });

  it('should render KPI cards with correct financial data', () => {
    const mockOrders = [
      {
        id: '1',
        totalAmount: 100,
        userId: 'user1',
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Entregado',
        items: [{ menuItemId: 'item1', name: 'Taco', quantity: 2, unitPrice: 50 }],
        deleted: false,
      },
      {
        id: '2',
        totalAmount: 150,
        userId: 'user2',
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Preparando',
        items: [{ menuItemId: 'item2', name: 'Burrito', quantity: 1, unitPrice: 150 }],
        deleted: false,
      },
    ];

    const mockExpenses = [
      {
        id: 'exp1',
        amount: 50,
        expenseDate: Timestamp.fromDate(new Date()),
        status: 'approved',
        deleted: false,
      },
    ];

    // Configurar mocks para cada llamada a useCollection
    mockUseCollection
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }) // orders
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareOrders
      .mockReturnValueOnce({ data: mockExpenses, isLoading: false }) // expenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareExpenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // pendingExpenses
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }); // allOrders

    render(<AdminDashboardPage />);

    // Verificar Ingresos (100 + 150 = 250)
    expect(screen.getByText('$250.00')).toBeInTheDocument();

    // Verificar Gastos (50)
    expect(screen.getByText('$50.00')).toBeInTheDocument();

    // Verificar Ganancia (250 - 50 = 200)
    expect(screen.getByText('$200.00')).toBeInTheDocument();

    // Verificar Margen ((200/250)*100 = 80%)
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('should render Top 5 productos section', () => {
    const mockOrders = [
      {
        id: '1',
        totalAmount: 100,
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Entregado',
        items: [
          { menuItemId: 'item1', name: 'Taco al Pastor', quantity: 5, unitPrice: 20 },
          { menuItemId: 'item2', name: 'Burrito', quantity: 2, unitPrice: 50 },
        ],
        deleted: false,
      },
      {
        id: '2',
        totalAmount: 150,
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Preparando',
        items: [
          { menuItemId: 'item1', name: 'Taco al Pastor', quantity: 3, unitPrice: 20 },
        ],
        deleted: false,
      },
    ];

    mockUseCollection
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }) // orders
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareOrders
      .mockReturnValueOnce({ data: [], isLoading: false }) // expenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareExpenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // pendingExpenses
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }); // allOrders

    render(<AdminDashboardPage />);

    // Verificar que se muestra la sección de Top 5 Productos
    expect(screen.getByText('Top 5 Productos')).toBeInTheDocument();

    // Verificar que se muestran los productos (Taco al Pastor: 5+3=8, Burrito: 2)
    expect(screen.getByText('Taco al Pastor')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Burrito')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should render alerts when there are pending expenses', () => {
    const mockPendingExpenses = [
      {
        id: 'exp1',
        amount: 100,
        expenseDate: Timestamp.fromDate(new Date()),
        status: 'pending',
        deleted: false,
      },
      {
        id: 'exp2',
        amount: 200,
        expenseDate: Timestamp.fromDate(new Date()),
        status: 'pending',
        deleted: false,
      },
    ];

    mockUseCollection
      .mockReturnValueOnce({ data: [], isLoading: false }) // orders
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareOrders
      .mockReturnValueOnce({ data: [], isLoading: false }) // expenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareExpenses
      .mockReturnValueOnce({ data: mockPendingExpenses, isLoading: false }) // pendingExpenses
      .mockReturnValueOnce({ data: [], isLoading: false }); // allOrders

    render(<AdminDashboardPage />);

    // Verificar sección de Alertas
    expect(screen.getByText('Alertas')).toBeInTheDocument();

    // Verificar que se muestra la alerta de gastos pendientes
    expect(screen.getByText('2 gastos pendientes de aprobación')).toBeInTheDocument();
  });

  it('should render alert for orders without driver', () => {
    const mockOrders = [
      {
        id: '1',
        totalAmount: 100,
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Preparando',
        driverId: undefined, // Sin repartidor
        items: [],
        deleted: false,
      },
    ];

    mockUseCollection
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }) // orders
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareOrders
      .mockReturnValueOnce({ data: [], isLoading: false }) // expenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareExpenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // pendingExpenses
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }); // allOrders

    render(<AdminDashboardPage />);

    // Verificar que se muestra la alerta de pedidos sin repartidor
    expect(screen.getByText('1 pedido sin repartidor asignado')).toBeInTheDocument();
  });

  it('should render "Todo en orden" when there are no alerts', () => {
    const mockOrders = [
      {
        id: '1',
        totalAmount: 100,
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Entregado',
        driverId: 'driver1', // Con repartidor
        items: [],
        deleted: false,
      },
    ];

    mockUseCollection
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }) // orders
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareOrders
      .mockReturnValueOnce({ data: [], isLoading: false }) // expenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareExpenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // pendingExpenses (sin gastos pendientes)
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }); // allOrders

    render(<AdminDashboardPage />);

    // Verificar que muestra mensaje de "Todo en orden"
    expect(screen.getByText('Todo en orden ✓')).toBeInTheDocument();
  });

  it('should render date range selector', () => {
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });

    render(<AdminDashboardPage />);

    // Verificar que existe el selector de rango de fechas
    // El Select de shadcn/ui usa un trigger con texto
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Resumen ejecutivo de tu negocio')).toBeInTheDocument();
  });

  it('should render chart sections', () => {
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });

    render(<AdminDashboardPage />);

    // Verificar secciones de gráficas
    expect(screen.getByText('Ingresos vs Gastos')).toBeInTheDocument();
    expect(screen.getByText('Comparación diaria de ingresos y gastos')).toBeInTheDocument();
    expect(screen.getByText('Estado de Pedidos')).toBeInTheDocument();
  });

  it('should show empty state when there is no data', () => {
    mockUseCollection.mockReturnValue({ data: [], isLoading: false });

    render(<AdminDashboardPage />);

    // Verificar estados vacíos
    expect(screen.getByText('$0.00')).toBeInTheDocument(); // Ingresos
    expect(screen.getAllByText('$0.00').length).toBe(2); // Ingresos y Gastos
    expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument(); // Gráfica
    expect(screen.getByText('No hay datos de productos')).toBeInTheDocument(); // Top productos
    expect(screen.getByText('No hay pedidos')).toBeInTheDocument(); // Gráfica de dona
  });

  it('should calculate profit correctly when expenses exceed revenue', () => {
    const mockOrders = [
      {
        id: '1',
        totalAmount: 100,
        orderDate: Timestamp.fromDate(new Date()),
        orderStatus: 'Entregado',
        items: [],
        deleted: false,
      },
    ];

    const mockExpenses = [
      {
        id: 'exp1',
        amount: 200, // Gastos mayores que ingresos
        expenseDate: Timestamp.fromDate(new Date()),
        status: 'approved',
        deleted: false,
      },
    ];

    mockUseCollection
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }) // orders
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareOrders
      .mockReturnValueOnce({ data: mockExpenses, isLoading: false }) // expenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // compareExpenses
      .mockReturnValueOnce({ data: [], isLoading: false }) // pendingExpenses
      .mockReturnValueOnce({ data: mockOrders, isLoading: false }); // allOrders

    render(<AdminDashboardPage />);

    // Verificar que muestra ganancia negativa (-100)
    expect(screen.getByText('$-100.00')).toBeInTheDocument();
  });
});
