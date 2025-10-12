import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartPage from './page';
import { useCart } from '@/context/cart-context';
import { useUser } from '@/firebase/provider';

// Mock dependencies
jest.mock('@/context/cart-context', () => ({
  useCart: jest.fn(),
}));
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(),
}));
jest.mock('@/components/StorageImage', () => ({
  __esModule: true,
  default: (props: any) => <img alt={props.alt} />,
}));

global.fetch = jest.fn();

const mockUpdateQuantity = jest.fn();
const mockRemoveFromCart = jest.fn();

const mockCartItems = [
  { cartItemId: 'prod1_ts', id: 'prod1', name: 'Taco de Pastor', price: 25, quantity: 2, imageUrl: 'pastor.jpg', customizations: { added: ['Queso'], removed: ['Cebolla'] } },
  { cartItemId: 'prod2_ts', id: 'prod2', name: 'Agua de Horchata', price: 20, quantity: 1, imageUrl: 'horchata.jpg', customizations: { added: [], removed: [] } },
];

describe('CartPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue({ user: { uid: 'test-user' }, isUserLoading: false });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ summary: { subtotalGeneral: 70.00, ivaDesglosado: 11.20, totalFinal: 81.20 } }),
    });
  });

  it('should render empty cart message when there are no items', () => {
    (useCart as jest.Mock).mockReturnValue({ cartItems: [], updateQuantity: mockUpdateQuantity, removeFromCart: mockRemoveFromCart });
    render(<CartPage />);
    expect(screen.getByText('Tu Carrito está Vacío')).toBeInTheDocument();
  });

  it('should render items, display customizations, and show server-verified totals', async () => {
    (useCart as jest.Mock).mockReturnValue({ cartItems: mockCartItems, updateQuantity: mockUpdateQuantity, removeFromCart: mockRemoveFromCart });
    render(<CartPage />);

    // Verify items and customizations are rendered
    expect(screen.getByText('Taco de Pastor')).toBeInTheDocument();
    expect(screen.getByText('+ Queso')).toBeInTheDocument();
    expect(screen.getByText('- Cebolla')).toBeInTheDocument();
    expect(screen.getByText('Agua de Horchata')).toBeInTheDocument();

    // Verify totals are updated after fetch
    await waitFor(() => {
      expect(screen.getByText('$70.00')).toBeInTheDocument();
      expect(screen.getByText('$11.20')).toBeInTheDocument();
      expect(screen.getByText('$81.20')).toBeInTheDocument();
    });
  });

  it('should call updateQuantity with cartItemId when plus button is clicked', async () => {
    (useCart as jest.Mock).mockReturnValue({ cartItems: mockCartItems, updateQuantity: mockUpdateQuantity, removeFromCart: mockRemoveFromCart });
    render(<CartPage />);
    
    const plusButtons = await screen.findAllByRole('button', { name: /Aumentar cantidad/i });
    fireEvent.click(plusButtons[0]);

    expect(mockUpdateQuantity).toHaveBeenCalledWith('prod1_ts', 3);
  });

  it('should call removeFromCart with cartItemId when trash button is clicked', async () => {
    (useCart as jest.Mock).mockReturnValue({ cartItems: mockCartItems, updateQuantity: mockUpdateQuantity, removeFromCart: mockRemoveFromCart });
    render(<CartPage />);

    const removeButtons = await screen.findAllByRole('button', { name: /Eliminar item/i });
    fireEvent.click(removeButtons[0]);

    expect(mockRemoveFromCart).toHaveBeenCalledWith('prod1_ts');
  });
});