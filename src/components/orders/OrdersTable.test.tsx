import { render, screen, fireEvent } from '@testing-library/react';
import { OrdersTable } from './OrdersTable';
import { Order } from '@/lib/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  MapPin: () => <div data-testid="mappin-icon">MapPin</div>,
  User: () => <div data-testid="user-icon">User</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
}));

describe('OrdersTable Component', () => {
  const mockOrders: Order[] = [
    {
      id: 'order-123',
      userId: 'user-1',
      status: 'Preparando',
      totalVerified: 25000,
      createdAt: new Date('2025-10-13T10:30:00Z'),
      items: [],
      shippingAddress: {
        street: 'Av. Libertador 1234',
        city: 'Santiago',
        state: 'RM',
        postalCode: '8320000',
        country: 'Chile',
        phone: '+56912345678',
        name: 'Juan Pérez',
      },
      paymentMethod: 'Efectivo',
      userName: 'Juan Pérez',
      userEmail: 'juan@example.com',
      userPhone: '+56912345678',
    },
    {
      id: 'order-456',
      userId: 'user-2',
      status: 'En Reparto',
      totalVerified: 15000,
      createdAt: new Date('2025-10-13T11:00:00Z'),
      items: [],
      shippingAddress: 'whatsapp',
      paymentMethod: 'Tarjeta a la entrega',
      userName: 'María García',
      userEmail: 'maria@example.com',
    },
  ];

  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading skeletons when isLoading is true', () => {
    render(
      <OrdersTable
        orders={[]}
        isLoading={true}
        onViewDetails={mockOnViewDetails}
      />
    );

    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render empty state when no orders and not loading', () => {
    render(
      <OrdersTable
        orders={[]}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('No se encontraron pedidos')).toBeInTheDocument();
    expect(screen.getByText('Intenta ajustar los filtros o la búsqueda')).toBeInTheDocument();
  });

  it('should render table with orders', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Dirección')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();

    // Check orders data
    expect(screen.getByText('#ORDER-')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
  });

  it('should format order IDs correctly', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Should show last 6 characters uppercase
    expect(screen.getByText(/#ORDER-/)).toBeInTheDocument();
  });

  it('should format currency correctly', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Chilean peso format
    expect(screen.getByText(/\$25\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$15\.000/)).toBeInTheDocument();
  });

  it('should render status badges with correct styles', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    const preparandoBadge = screen.getByText('Preparando');
    const enRepartoBadge = screen.getByText('En Reparto');

    expect(preparandoBadge).toBeInTheDocument();
    expect(enRepartoBadge).toBeInTheDocument();
  });

  it('should handle different address types correctly', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Object address
    expect(screen.getByText(/Av\. Libertador 1234, Santiago/)).toBeInTheDocument();

    // WhatsApp address
    expect(screen.getByText('Coordinación WhatsApp')).toBeInTheDocument();
  });

  it('should call onViewDetails when clicking Ver button', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    const viewButtons = screen.getAllByText('Ver');
    fireEvent.click(viewButtons[0]);

    expect(mockOnViewDetails).toHaveBeenCalledWith('order-123');
  });

  it('should show "Sin asignar" for orders without driver', () => {
    render(
      <OrdersTable
        orders={mockOrders}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    const sinAsignar = screen.getAllByText('Sin asignar');
    expect(sinAsignar.length).toBeGreaterThan(0);
  });

  it('should render driver info when present', () => {
    const ordersWithDriver: Order[] = [
      {
        ...mockOrders[0],
        driverName: 'Carlos Conductor',
        driverPhone: '+56987654321',
      },
    ];

    render(
      <OrdersTable
        orders={ordersWithDriver}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Carlos Conductor')).toBeInTheDocument();
    expect(screen.getByText('+56987654321')).toBeInTheDocument();
  });

  it('should handle GPS location addresses', () => {
    const ordersWithGPS: Order[] = [
      {
        ...mockOrders[0],
        shippingAddress: 'https://maps.google.com/?q=-33.4569,-70.6483',
      },
    ];

    render(
      <OrdersTable
        orders={ordersWithGPS}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Ubicación GPS')).toBeInTheDocument();
  });

  it('should handle orders with unknown status gracefully', () => {
    const ordersWithUnknownStatus: Order[] = [
      {
        ...mockOrders[0],
        status: 'Unknown' as any,
      },
    ];

    render(
      <OrdersTable
        orders={ordersWithUnknownStatus}
        isLoading={false}
        onViewDetails={mockOnViewDetails}
      />
    );

    // Should render without crashing
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
