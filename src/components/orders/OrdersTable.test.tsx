import { render, screen, fireEvent } from '@testing-library/react';
import { OrdersTable } from './OrdersTable';
import { Order } from '@/lib/types';

const mockOrders: Order[] = [
  {
    id: 'ORDER-123456',
    userId: 'user-1',
    userName: 'Juan Pérez',
    userEmail: 'juan@example.com',
    userPhone: '+56912345678',
    items: [],
    totalVerified: 25000,
    paymentMethod: 'Efectivo',
    status: 'Preparando',
    createdAt: new Date('2025-10-13T09:30:00Z'),
    shippingAddress: {
      street: 'Av. Libertador 1234',
      city: 'Santiago',
      state: 'RM',
      postalCode: '12345',
      country: 'Chile',
      phone: '',
      name: ''
    },
    subtotalVerified: 0,
    taxVerified: 0
  },
  {
    id: 'ORDER-ABCDEF',
    userId: 'user-2',
    userName: 'María García',
    userEmail: 'maria@example.com',
    items: [],
    totalVerified: 15000,
    paymentMethod: 'Tarjeta a la entrega',
    status: 'En Reparto',
    createdAt: new Date('2025-10-13T10:00:00Z'),
    shippingAddress: 'whatsapp',
    subtotalVerified: 0,
    taxVerified: 0
  },
];

describe('OrdersTable Component', () => {
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading skeletons when isLoading is true', () => {
    render(<OrdersTable orders={[]} isLoading={true} onViewDetails={mockOnViewDetails} />);
    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons.length).toBe(5);
  });

  it('should render empty state when there are no orders', () => {
    render(<OrdersTable orders={[]} isLoading={false} onViewDetails={mockOnViewDetails} />);
    expect(screen.getByText('No se encontraron pedidos')).toBeInTheDocument();
  });

  it('should render a table with order data', () => {
    render(<OrdersTable orders={mockOrders} isLoading={false} onViewDetails={mockOnViewDetails} />);

    // Verificar encabezados
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();

    // Verificar datos de la primera orden
    expect(screen.getByText(/#123456/)).toBeInTheDocument(); // Formato de ID
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Preparando/)).toBeInTheDocument();
    expect(screen.getByText('$25.000')).toBeInTheDocument(); // Formato de moneda

    // Verificar datos de la segunda orden
    expect(screen.getByText(/#ABCDEF/)).toBeInTheDocument();
    expect(screen.getByText('María García')).toBeInTheDocument();
    expect(screen.getByText(/En Reparto/)).toBeInTheDocument();
    expect(screen.getByText('Coordinación WhatsApp')).toBeInTheDocument();
  });

  it('should call onViewDetails with the correct order ID when "Ver" button is clicked', () => {
    render(<OrdersTable orders={mockOrders} isLoading={false} onViewDetails={mockOnViewDetails} />);

    const viewButtons = screen.getAllByRole('button', { name: /Ver/i });
    fireEvent.click(viewButtons[0]); // Click en el botón de la primera orden

    expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
    expect(mockOnViewDetails).toHaveBeenCalledWith('ORDER-123456');
  });
});
