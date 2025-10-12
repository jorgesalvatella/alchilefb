import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MenuPage from './page';
import { useCart } from '@/context/cart-context';
import { SaleProduct } from '@/lib/types';

// Mock dependencies
jest.mock('@/context/cart-context', () => ({
  useCart: jest.fn(),
}));
jest.mock('@/components/StorageImage', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('@/components/menu/ProductCustomizationDialog', () => ({
  ProductCustomizationDialog: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Dialog Open</div> : null,
}));

const mockAddItem = jest.fn();

const mockProducts: SaleProduct[] = [
  {
    id: 'prod1',
    name: 'Taco Simple',
    price: 20,
    description: 'Solo tortilla y carne',
    isAvailable: true,
    isTaxable: true,
    basePrice: 17.24,
    businessUnitId: 'bu1',
    departmentId: 'dep1',
    categoriaVentaId: 'cat1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
  {
    id: 'prod2',
    name: 'Taco Personalizable',
    price: 25,
    description: 'Con todo',
    isAvailable: true,
    isTaxable: true,
    basePrice: 21.55,
    businessUnitId: 'bu1',
    departmentId: 'dep1',
    categoriaVentaId: 'cat1',
    ingredientesBase: ['Cebolla', 'Cilantro'],
    ingredientesExtra: [{ nombre: 'Queso', precio: 10 }],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

const mockCategories = [{ id: 'cat1', name: 'Tacos' }];

global.fetch = jest.fn((url) =>
  Promise.resolve({
    ok: true,
    json: () => {
      if (url === '/api/menu') return Promise.resolve(mockProducts);
      if (url === '/api/categorias-venta') return Promise.resolve(mockCategories);
      return Promise.resolve([]);
    },
  })
) as jest.Mock;


describe('MenuPage and ProductCard Logic', () => {
  beforeEach(() => {
    (useCart as jest.Mock).mockReturnValue({ addItem: mockAddItem });
    jest.clearAllMocks();
  });

  it('should show "Añadir al Carrito" for simple products and call addItem on click', async () => {
    render(<MenuPage />);
    const simpleProductCard = await screen.findByText('Taco Simple');
    const addButton = simpleProductCard.closest('.group')?.querySelector('button');
    
    expect(addButton).toHaveTextContent('Añadir al Carrito');
    fireEvent.click(addButton!);
    expect(mockAddItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod1' }));
  });

  it('should show "Personalizar y Añadir" for customizable products', async () => {
    render(<MenuPage />);
    const customizableCard = await screen.findByText('Taco Personalizable');
    const customizeButton = customizableCard.closest('.group')?.querySelector('button');
    
    expect(customizeButton).toHaveTextContent('Personalizar y Añadir');
  });

  it('should open the customization dialog when "Personalizar y Añadir" is clicked', async () => {
    render(<MenuPage />);
    const customizableCard = await screen.findByText('Taco Personalizable');
    const customizeButton = customizableCard.closest('.group')?.querySelector('button');

    fireEvent.click(customizeButton!);

    expect(await screen.findByText('Dialog Open')).toBeInTheDocument();
    expect(mockAddItem).not.toHaveBeenCalled();
  });
});
