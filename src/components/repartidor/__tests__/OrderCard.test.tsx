import { render, screen } from '@testing-library/react';
import { OrderCard } from '../OrderCard';
import { Order } from '@/lib/types';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('OrderCard Component', () => {
  const mockOrder: Order = {
    id: 'order123',
    userId: 'user123',
    items: [
      {
        id: 'item1',
        nombre: 'Tacos al Pastor',
        precio: 50,
        cantidad: 2,
        imagen: '',
        categoria: 'Comida',
        disponible: true,
      },
    ],
    totalVerified: 100,
    total: 100,
    paymentMethod: 'Efectivo',
    status: 'Preparando',
    createdAt: new Date('2025-01-18T10:00:00Z'),
    shippingAddress: {
      name: 'Juan Pérez',
      phone: '555-1234',
      street: 'Calle Principal 123',
      city: 'Ciudad',
      state: 'Estado',
      postalCode: '12345',
      country: 'México',
      lat: 19.4326,
      lng: -99.1332,
    },
  };

  beforeEach(() => {
    mockPush.mockClear();
  });

  it('should render order card with correct information', () => {
    render(<OrderCard order={mockOrder} />);

    // Check customer name
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

    // Check address (truncated)
    expect(screen.getByText(/Calle Principal 123/)).toBeInTheDocument();

    // Check total
    expect(screen.getByText(/\$100/)).toBeInTheDocument();

    // Check payment method
    expect(screen.getByText('Efectivo')).toBeInTheDocument();

    // Check items count
    expect(screen.getByText(/2 productos/)).toBeInTheDocument();
  });

  it('should render "Preparando" status badge with correct styling', () => {
    render(<OrderCard order={mockOrder} />);

    const statusBadge = screen.getByText(/Preparando/);
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-blue-500');
  });

  it('should render "En Reparto" status badge with correct styling', () => {
    const orderInProgress = { ...mockOrder, status: 'En Reparto' as const };
    render(<OrderCard order={orderInProgress} />);

    const statusBadge = screen.getByText(/En Reparto/);
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-green-500');
  });

  it('should render "Entregado" status badge with correct styling', () => {
    const deliveredOrder = { ...mockOrder, status: 'Entregado' as const };
    render(<OrderCard order={deliveredOrder} />);

    const statusBadge = screen.getByText(/Entregado/);
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-gray-500');
  });

  it('should have correct link to order detail page', () => {
    render(<OrderCard order={mockOrder} />);

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/repartidor/pedidos/order123');
  });

  it('should handle orders with single item correctly', () => {
    const singleItemOrder = {
      ...mockOrder,
      items: [mockOrder.items[0]],
    };
    singleItemOrder.items[0].cantidad = 1;

    render(<OrderCard order={singleItemOrder} />);

    expect(screen.getByText(/1 producto/)).toBeInTheDocument();
  });

  it('should display truncated address for long addresses', () => {
    const longAddressOrder = {
      ...mockOrder,
      shippingAddress: {
        ...mockOrder.shippingAddress,
        street: 'Calle Muy Larga Con Muchos Caracteres Número 123 Bis Interior 4',
      },
    };

    render(<OrderCard order={longAddressOrder} />);

    const addressElement = screen.getByText(/Calle Muy Larga/);
    expect(addressElement).toBeInTheDocument();
  });

  it('should display order ID in short format', () => {
    render(<OrderCard order={mockOrder} />);

    // Should show first 8 characters of ID with # prefix
    expect(screen.getByText(/#order123/)).toBeInTheDocument();
  });

  it('should display phone number if available', () => {
    render(<OrderCard order={mockOrder} />);

    expect(screen.getByText('555-1234')).toBeInTheDocument();
  });

  it('should format currency correctly', () => {
    const orderWith1500 = { ...mockOrder, totalVerified: 1500 };
    render(<OrderCard order={orderWith1500} />);

    expect(screen.getByText(/\$1500\.00/)).toBeInTheDocument();
  });
});
