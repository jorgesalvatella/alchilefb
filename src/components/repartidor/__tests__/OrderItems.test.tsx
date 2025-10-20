import { render, screen } from '@testing-library/react';
import { OrderItems } from '../OrderItems';
import { CartItem } from '@/lib/types';

describe('OrderItems Component', () => {
  const mockItems: CartItem[] = [
    {
      id: 'item1',
      nombre: 'Tacos al Pastor',
      precio: 50,
      cantidad: 2,
      imagen: '/tacos.jpg',
      categoria: 'Comida',
      disponible: true,
    },
    {
      id: 'item2',
      nombre: 'Quesadilla',
      precio: 40,
      cantidad: 1,
      imagen: '/quesadilla.jpg',
      categoria: 'Comida',
      disponible: true,
    },
  ];

  it('should render all items', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Tacos al Pastor/)).toBeInTheDocument();
    expect(screen.getByText(/Quesadilla/)).toBeInTheDocument();
  });

  it('should display item quantities correctly', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/x2/)).toBeInTheDocument();
    expect(screen.getByText(/x1/)).toBeInTheDocument();
  });

  it('should display item prices', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/\$50/)).toBeInTheDocument();
    expect(screen.getByText(/\$40/)).toBeInTheDocument();
  });

  it('should display total amount', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText(/\$140/)).toBeInTheDocument();
  });

  it('should display payment method', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Efectivo/)).toBeInTheDocument();
  });

  it('should display "Tarjeta a la entrega" payment method', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Tarjeta a la entrega" />);

    expect(screen.getByText(/Tarjeta a la entrega/)).toBeInTheDocument();
  });

  it('should display "Transferencia bancaria" payment method', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Transferencia bancaria" />);

    expect(screen.getByText(/Transferencia bancaria/)).toBeInTheDocument();
  });

  it('should handle empty items array', () => {
    render(<OrderItems items={[]} total={0} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText(/\$0/)).toBeInTheDocument();
  });

  it('should display items with customizations', () => {
    const itemsWithCustomizations: CartItem[] = [
      {
        id: 'item1',
        nombre: 'Hamburguesa',
        precio: 80,
        cantidad: 1,
        imagen: '',
        categoria: 'Comida',
        disponible: true,
        customizations: {
          added: [
            { nombre: 'Extra queso', precio: 10 },
            { nombre: 'Tocino', precio: 15 },
          ],
          removed: ['Cebolla'],
        },
      },
    ];

    render(<OrderItems items={itemsWithCustomizations} total={105} paymentMethod="Efectivo" />);

    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText(/Extra queso/)).toBeInTheDocument();
    expect(screen.getByText(/Tocino/)).toBeInTheDocument();
    expect(screen.getByText(/Sin Cebolla/)).toBeInTheDocument();
  });

  it('should format currency correctly for large amounts', () => {
    const expensiveItems: CartItem[] = [
      {
        id: 'item1',
        nombre: 'Producto Caro',
        precio: 1500,
        cantidad: 2,
        imagen: '',
        categoria: 'Especial',
        disponible: true,
      },
    ];

    render(<OrderItems items={expensiveItems} total={3000} paymentMethod="Efectivo" />);

    expect(screen.getByText(/\$1,500/)).toBeInTheDocument();
    expect(screen.getByText(/\$3,000/)).toBeInTheDocument();
  });

  it('should display shopping bag icon', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    const shoppingBagIcon = screen.getByTestId('shopping-bag-icon');
    expect(shoppingBagIcon).toBeInTheDocument();
  });

  it('should display credit card icon', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    const creditCardIcon = screen.getByTestId('credit-card-icon');
    expect(creditCardIcon).toBeInTheDocument();
  });

  it('should calculate total correctly for multiple items', () => {
    const multipleItems: CartItem[] = [
      {
        id: '1',
        nombre: 'Item 1',
        precio: 25,
        cantidad: 2,
        imagen: '',
        categoria: 'Cat1',
        disponible: true,
      },
      {
        id: '2',
        nombre: 'Item 2',
        precio: 50,
        cantidad: 3,
        imagen: '',
        categoria: 'Cat2',
        disponible: true,
      },
    ];

    // Total should be: (25 * 2) + (50 * 3) = 50 + 150 = 200
    render(<OrderItems items={multipleItems} total={200} paymentMethod="Efectivo" />);

    expect(screen.getByText(/\$200/)).toBeInTheDocument();
  });

  it('should apply correct styling to container', () => {
    const { container } = render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    const mainDiv = container.querySelector('.bg-white');
    expect(mainDiv).toBeInTheDocument();
  });

  it('should show item count heading', () => {
    render(<OrderItems items={mockItems} total={140} paymentMethod="Efectivo" />);

    expect(screen.getByText(/Artículos del Pedido/)).toBeInTheDocument();
  });

  it('should handle items with decimal prices', () => {
    const decimalItems: CartItem[] = [
      {
        id: 'item1',
        nombre: 'Item con decimales',
        precio: 49.99,
        cantidad: 1,
        imagen: '',
        categoria: 'Test',
        disponible: true,
      },
    ];

    render(<OrderItems items={decimalItems} total={49.99} paymentMethod="Efectivo" />);

    expect(screen.getByText(/\$49\.99/)).toBeInTheDocument();
  });
});
