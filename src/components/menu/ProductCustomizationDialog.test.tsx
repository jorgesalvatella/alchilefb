import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductCustomizationDialog } from './ProductCustomizationDialog';
import { useCart } from '@/context/cart-context';
import { toast } from '@/hooks/use-toast';
import { SaleProduct } from '@/lib/types';

// Mock dependencies
jest.mock('@/context/cart-context', () => ({
  useCart: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const mockAddItem = jest.fn();

const mockProduct: SaleProduct = {
  id: 'prod1',
  name: 'Hamburguesa Especial',
  description: 'Una delicia',
  price: 150,
  isAvailable: true,
  isTaxable: true,
  basePrice: 129.31,
  businessUnitId: 'bu1',
  departmentId: 'dep1',
  categoriaVentaId: 'cat1',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ingredientesBase: ['Lechuga', 'Tomate'],
  ingredientesExtra: [
    { nombre: 'Tocino', precio: 25 },
    { nombre: 'Queso Extra', precio: 15 },
  ],
};

describe('ProductCustomizationDialog', () => {
  beforeEach(() => {
    (useCart as jest.Mock).mockReturnValue({ addItem: mockAddItem });
    jest.clearAllMocks();
  });

  it('renders product details and customization options correctly', () => {
    render(
      <ProductCustomizationDialog
        product={mockProduct}
        isOpen={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('Hamburguesa Especial')).toBeInTheDocument();
    expect(screen.getByText('Lechuga')).toBeInTheDocument();
    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('Tocino')).toBeInTheDocument();
    expect(screen.getByText('+$25.00')).toBeInTheDocument();
  });

  it('updates the price when an extra is selected', () => {
    render(
      <ProductCustomizationDialog
        product={mockProduct}
        isOpen={true}
        onOpenChange={() => {}}
      />
    );

    const tocinoCheckbox = screen.getByLabelText('Tocino');
    fireEvent.click(tocinoCheckbox);

    const addButton = screen.getByRole('button', { name: /Añadir por \$175.00/i });
    expect(addButton).toBeInTheDocument();
  });

  it('calls addItem with correct customizations when add button is clicked', () => {
    const onOpenChange = jest.fn();
    render(
      <ProductCustomizationDialog
        product={mockProduct}
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );

    // Select Tocino
    fireEvent.click(screen.getByLabelText('Tocino'));
    // Deselect Lechuga
    fireEvent.click(screen.getByLabelText('Lechuga'));
    // Increase quantity to 2
    fireEvent.click(screen.getByRole('button', { name: /Aumentar cantidad/i }));

    fireEvent.click(screen.getByRole('button', { name: /Añadir por/ }));

    expect(mockAddItem).toHaveBeenCalledWith({
      id: 'prod1',
      name: 'Hamburguesa Especial',
      price: 150,
      quantity: 2,
      imageUrl: undefined,
      customizations: {
        added: ['Tocino'],
        removed: ['Lechuga'],
      },
    });
    expect(toast).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
