import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartPage from './page';
import { useCart } from '@/context/cart-context';
import { useUser } from '@/firebase';

// Mock dependencies
jest.mock('@/context/cart-context', () => ({
  useCart: jest.fn(),
}));

jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));

jest.mock('@/components/StorageImage', () => ({
  __esModule: true,
  default: ({ alt }) => <img alt={alt} />,
}));

global.fetch = jest.fn();

const mockUpdateQuantity = jest.fn();
const mockRemoveFromCart = jest.fn();

const mockCartItems = [
  { cartItemId: '1_abc', id: '1', name: 'Taco de Pastor', price: 25, quantity: 2, imageUrl: '', customizations: { added: ['Queso'], removed: [] } },
  { cartItemId: '2_def', id: '2', name: 'Agua de Horchata', price: 20, quantity: 1, imageUrl: '', customizations: { added: [], removed: [] } },
];

describe('CartPage', () => {
  beforeEach(() => {
    (useCart as jest.Mock).mockClear();
    (useUser as jest.Mock).mockClear();
    mockUpdateQuantity.mockClear();
    mockRemoveFromCart.mockClear();
    (fetch as jest.Mock).mockClear();

    // Default mocks
    (useUser as jest.Mock).mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { subtotalGeneral: 70.00, ivaDesglosado: 11.20, totalFinal: 81.20 } }),
    });
  });

  it('should render empty cart message when there are no items', () => {
    (useCart as jest.Mock).mockReturnValue({ cartItems: [] });
    render(<CartPage />);
    expect(screen.getByText('Tu Carrito está Vacío')).toBeInTheDocument();
  });

  it('should render items and display server-verified totals', async () => {
    (useCart as jest.Mock).mockReturnValue({ cartItems: mockCartItems });
    render(<CartPage />);

    expect(screen.getByText('Taco de Pastor')).toBeInTheDocument();
    expect(screen.getByText('+ Queso')).toBeInTheDocument();
    expect(screen.getByText('Agua de Horchata')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('$70.00')).toBeInTheDocument();
      expect(screen.getByText('$11.20')).toBeInTheDocument();
      expect(screen.getByText('$81.20')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/api/cart/verify-totals', expect.any(Object));
  });

  it('should call updateQuantity with cartItemId when quantity is changed', () => {
    (useCart as jest.Mock).mockReturnValue({
      cartItems: mockCartItems,
      updateQuantity: mockUpdateQuantity,
    });
    render(<CartPage />);

    const plusButton = screen.getAllByRole('button', { name: /Aumentar cantidad/i })[0];
    fireEvent.click(plusButton);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('1_abc', 3);
  });

  it('should call removeFromCart with cartItemId when trash button is clicked', () => {
    (useCart as jest.Mock).mockReturnValue({
      cartItems: mockCartItems,
      removeFromCart: mockRemoveFromCart,
    });
    render(<CartPage />);

    const trashButton = screen.getAllByRole('button', { name: /Eliminar item/i })[0];
    fireEvent.click(trashButton);

    expect(mockRemoveFromCart).toHaveBeenCalledWith('1_abc');
  });
});