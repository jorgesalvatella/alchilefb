import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { OrderDetailsSheet } from './OrderDetailsSheet';
import { Order } from '@/lib/types';

const mockOrder: Order = {
  id: 'ORDER-XYZ789',
  userId: 'user-123',
  userName: 'Beto',
  userEmail: 'beto@test.com',
  userPhone: '987654321',
  items: [
    {
      id: 'item-1',
      name: 'Taco de Suadero',
      quantity: 2,
      price: 15,
      customizations: { added: [{ nombre: 'Queso', precio: 2 }], removed: ['Cebolla'] },
    },
    { id: 'item-2', name: 'Agua de Horchata', quantity: 1, price: 5 },
  ],
  totalVerified: 35,
  status: 'Preparando',
  paymentMethod: 'Efectivo',
  shippingAddress: {
    street: 'Av. Siempre Viva 742',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704',
    country: 'USA',
    name: 'Casa',
    phone: '123456789'
  },
  createdAt: new Date('2025-10-14T10:00:00Z'),
  statusHistory: [
    { status: 'Pedido Realizado', timestamp: new Date('2025-10-14T09:55:00Z') },
    { status: 'Preparando', timestamp: new Date('2025-10-14T10:00:00Z') },
  ],
  subtotalVerified: 0,
  taxVerified: 0
};

describe('OrderDetailsSheet Component', () => {
  const mockOnClose = jest.fn();
  const mockOnStatusChange = jest.fn();
  const mockOnCancelOrder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing if order is null', () => {
    const { container } = render(
      <OrderDetailsSheet
        order={null}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
        onCancelOrder={mockOnCancelOrder}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render all order details correctly', () => {
    render(
      <OrderDetailsSheet
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
        onCancelOrder={mockOnCancelOrder}
      />
    );

    // Header
    const header = screen.getByTestId('order-details-header');
    expect(within(header).getByText(/Pedido #XYZ789/)).toBeInTheDocument();
    expect(within(header).getByText('Preparando')).toBeInTheDocument();

    // Customer Info
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.getByText('beto@test.com')).toBeInTheDocument();
    expect(screen.getByText('987654321')).toBeInTheDocument();

    // Address
    expect(screen.getByText(/Av. Siempre Viva 742/)).toBeInTheDocument();

    // Items
    expect(screen.getByText('2x Taco de Suadero')).toBeInTheDocument();
    expect(screen.getByText(/Queso/)).toBeInTheDocument();
    expect(screen.getByText(/- Cebolla/)).toBeInTheDocument();
    expect(screen.getByText('1x Agua de Horchata')).toBeInTheDocument();
    
    // Total (CLP format)
    expect(screen.getByText('$35')).toBeInTheDocument();
  });

  it('should call onStatusChange when a new status is selected', async () => {
    render(
      <OrderDetailsSheet
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
        onCancelOrder={mockOnCancelOrder}
      />
    );

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.pointerDown(selectTrigger);

    const enRepartoOption = await screen.findByText('En Reparto');
    fireEvent.click(enRepartoOption);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('ORDER-XYZ789', 'En Reparto');
    });
  });

  it('should call onCancelOrder when cancellation is confirmed', async () => {
    render(
      <OrderDetailsSheet
        order={mockOrder}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
        onCancelOrder={mockOnCancelOrder}
      />
    );

    // 1. Open the cancel dialog
    const cancelButton = screen.getByRole('button', { name: /Cancelar Pedido/i });
    fireEvent.click(cancelButton);

    // 2. Find and fill the reason textarea
    const reasonTextarea = await screen.findByPlaceholderText(/Motivo de cancelación.../i);
    fireEvent.change(reasonTextarea, { target: { value: 'Cliente se arrepintió' } });

    // 3. Confirm cancellation - search with { hidden: true } to find in the active dialog
    const confirmButton = screen.getByRole('button', { name: /Confirmar Cancelación/i, hidden: true });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnCancelOrder).toHaveBeenCalledWith('ORDER-XYZ789', 'Cliente se arrepintió');
    });
  });
});
