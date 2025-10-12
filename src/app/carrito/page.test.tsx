import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartPage from './page';
import { useCart } from '@/context/cart-context';

// Mock the useCart hook
jest.mock('@/context/cart-context', () => ({
  useCart: jest.fn(),
}));

// Mock StorageImage component
jest.mock('@/components/StorageImage', () => ({
  __esModule: true,
  default: ({ alt }) => <img alt={alt} />,
}));

// Mock global fetch
global.fetch = jest.fn();

const mockUpdateQuantity = jest.fn();
const mockRemoveFromCart = jest.fn();

const mockCartItems = [
  { id: '1', name: 'Taco de Pastor', price: 25, quantity: 2, imageUrl: '' },
  { id: '2', name: 'Agua de Horchata', price: 20, quantity: 1, imageUrl: '' },
];

describe('CartPage', () => {
  beforeEach(() => {
    (useCart as jest.Mock).mockClear();
    mockUpdateQuantity.mockClear();
    mockRemoveFromCart.mockClear();
    (fetch as jest.Mock).mockClear();

    // Default successful fetch mock
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ total: 81.20, subtotal: 70.00, tax: 11.20 }),
    });
  });

  it('should render empty cart message when there are no items', () => {
    (useCart as jest.Mock).mockReturnValue({
      cartItems: [],
    });

    render(<CartPage />);
    
    expect(screen.getByText('Tu Carrito está Vacío')).toBeInTheDocument();
    expect(screen.getByText('Ir al Menú')).toBeInTheDocument();
  });

  it('should render items and display server-verified totals', async () => {
    (useCart as jest.Mock).mockReturnValue({
      cartItems: mockCartItems,
    });

    render(<CartPage />);

    // Items are rendered immediately
    expect(screen.getByText('Taco de Pastor')).toBeInTheDocument();
    expect(screen.getByText('Agua de Horchata')).toBeInTheDocument();

    // Totals show "Calculando..." initially
    expect(screen.getAllByText('Calculando...').length).toBe(3);

    // Wait for the fetch to resolve and update the totals
    await waitFor(() => {
      expect(screen.getByText('$70.00')).toBeInTheDocument(); // Subtotal from server
      expect(screen.getByText('$11.20')).toBeInTheDocument(); // Tax from server
      expect(screen.getByText('$81.20')).toBeInTheDocument(); // Total from server
    });

    expect(fetch).toHaveBeenCalledWith('/api/cart/verify-totals', expect.any(Object));
  });

  it('should call updateQuantity when plus button is clicked', () => {
    (useCart as jest.Mock).mockReturnValue({
      cartItems: mockCartItems,
      updateQuantity: mockUpdateQuantity,
    });

    render(<CartPage />);

    const tacoRow = screen.getByText('Taco de Pastor').closest('div.flex');
    const plusButton = within(tacoRow!).getByTestId('plus-circle-icon');
    
    fireEvent.click(plusButton);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3);
  });

  it('should call removeFromCart when trash button is clicked', () => {
    (useCart as jest.Mock).mockReturnValue({
      cartItems: mockCartItems,
      removeFromCart: mockRemoveFromCart,
    });

    render(<CartPage />);

    const tacoRow = screen.getByText('Taco de Pastor').closest('div.flex');
    const trashButton = within(tacoRow!).getByTestId('trash-2-icon');
    
    fireEvent.click(trashButton);

    expect(mockRemoveFromCart).toHaveBeenCalledWith('1');
  });
});