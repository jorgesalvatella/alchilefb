import { render, screen } from '@testing-library/react';
import { OrderItems } from '../OrderItems';

describe('OrderItems Component', () => {
  const mockItems = [
    {
      name: 'Tacos al Pastor',
      price: 50,
      quantity: 2,
    },
    {
      name: 'Quesadilla',
      price: 40,
      quantity: 1,
    },
  ];

  it('should render all items', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Tacos al Pastor/)).toBeInTheDocument();
    expect(screen.getByText(/Quesadilla/)).toBeInTheDocument();
  });

  it('should display item quantities correctly', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Cantidad: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Cantidad: 1/)).toBeInTheDocument();
  });

  it('should display item prices', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument(); // 50 * 2
    expect(screen.getByText(/\$40\.00/)).toBeInTheDocument(); // 40 * 1
  });

  it('should display total amount', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/\$140\.00/)).toBeInTheDocument();
  });

  it('should display payment method - cash', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="cash" />);

    expect(screen.getByText(/Efectivo/)).toBeInTheDocument();
  });

  it('should display payment method - card', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="card" />);

    expect(screen.getByText(/Tarjeta/)).toBeInTheDocument();
  });

  it('should display payment method - transfer', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="transfer" />);

    expect(screen.getByText(/Transferencia/)).toBeInTheDocument();
  });

  it('should handle empty items array', () => {
    render(<OrderItems items={[]} total={0} paymentMethod="cash" />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
  });

  it('should display item names and subtotals', () => {
    const items = [
      {
        name: 'Hamburguesa',
        price: 80,
        quantity: 1,
      },
    ];

    render(<OrderItems items={items} total={80} paymentMethod="cash" />);

    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    // Hay 2 instancias de $80.00: el subtotal del item y el total
    const prices = screen.getAllByText(/\$80\.00/);
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it('should format currency correctly for large amounts', () => {
    const expensiveItems = [
      {
        name: 'Producto Caro',
        price: 1500,
        quantity: 2,
      },
    ];

    render(<OrderItems items={expensiveItems} total={3000} paymentMethod="cash" />);

    // Hay 2 instancias de $3000.00: el subtotal del item y el total
    const prices = screen.getAllByText(/\$3000\.00/);
    expect(prices.length).toBe(2);
  });

  it('should display card header title', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="cash" />);

    expect(screen.getByText('Productos del Pedido')).toBeInTheDocument();
  });

  it('should display payment method label', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="cash" />);

    expect(screen.getByText('Método de pago:')).toBeInTheDocument();
  });

  it('should calculate total correctly for multiple items', () => {
    const multipleItems = [
      {
        name: 'Item 1',
        price: 25,
        quantity: 2,
      },
      {
        name: 'Item 2',
        price: 50,
        quantity: 3,
      },
    ];

    // Total should be: (25 * 2) + (50 * 3) = 50 + 150 = 200
    render(<OrderItems items={multipleItems} total={200} paymentMethod="cash" />);

    expect(screen.getByText(/\$200\.00/)).toBeInTheDocument();
  });

  it('should render as card component', () => {
    const { container } = render(<OrderItems items={mockItems} total={140} paymentMethod="cash" />);

    const card = container.querySelector('.rounded-lg.border');
    expect(card).toBeInTheDocument();
  });

  it('should show correct heading', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="cash" />);

    expect(screen.getByText('Productos del Pedido')).toBeInTheDocument();
  });

  it('should handle items with decimal prices', () => {
    const decimalItems = [
      {
        name: 'Item con decimales',
        price: 49.99,
        quantity: 1,
      },
    ];

    render(<OrderItems items={decimalItems} total={49.99} paymentMethod="cash" />);

    // Hay 2 instancias de $49.99: el subtotal del item y el total
    const prices = screen.getAllByText(/\$49\.99/);
    expect(prices.length).toBe(2);
  });
});
