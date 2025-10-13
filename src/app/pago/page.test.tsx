import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CheckoutPage from './page';
import { CartProvider, useCart } from '@/context/cart-context';
import { FirebaseProvider } from '@/firebase/provider'; // Import the actual provider
import { useRouter } from 'next/navigation';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Mock config
const firebaseConfig = {
  apiKey: 'mock-api-key',
  authDomain: 'mock-auth-domain',
  projectId: 'mock-project-id',
  storageBucket: 'mock-storage-bucket',
  messagingSenderId: 'mock-messaging-sender-id',
  appId: 'mock-app-id',
};

// Helper to initialize a mock Firebase app for tests
const initializeTestApp = () => {
  try {
    return getApp();
  } catch (e) {
    return initializeApp(firebaseConfig);
  }
};

// Mock de los hooks y componentes externos
jest.mock('@/context/cart-context', () => ({
  ...jest.requireActual('@/context/cart-context'),
  useCart: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const mockUseCart = useCart as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

const mockPush = jest.fn();
const mockClearCart = jest.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  const app = initializeTestApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Mock the currentUser and getIdToken with a more robust object
  Object.defineProperty(auth, 'currentUser', {
    value: { 
      getIdToken: () => Promise.resolve('fake-token'),
      _stopProactiveRefresh: () => {}, // Mock la función interna
    },
    writable: true,
  });

  return render(
    <FirebaseProvider firebaseApp={app} auth={auth} firestore={firestore} storage={storage}>
      <CartProvider>{ui}</CartProvider>
    </FirebaseProvider>
  );
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'order-123' }),
      })
    ) as jest.Mock;
  });

  afterAll(() => {
    // Clean up the mock app
    try {
      deleteApp(getApp());
    } catch (e) {
      // ignore
    }
  });

  it('should display empty cart message if cart is empty', () => {
    mockUseCart.mockReturnValue({
      cartItems: [],
      itemCount: 0,
      clearCart: mockClearCart,
    });
    renderWithProviders(<CheckoutPage />);
    expect(screen.getByText(/Tu carrito está vacío/i)).toBeInTheDocument(); // Selector flexible
    expect(screen.getByRole('button', { name: /Ir al Menú/i })).toBeInTheDocument();
  });

  it('should render checkout form when cart has items', () => {
    mockUseCart.mockReturnValue({
      cartItems: [{ cartItemId: '1', name: 'Taco', price: 10, quantity: 1 }],
      itemCount: 1,
      clearCart: mockClearCart,
    });
    renderWithProviders(<CheckoutPage />);
    expect(screen.getByText('Finalizar Compra')).toBeInTheDocument();
    expect(screen.getByText(/Dirección de Entrega/i)).toBeInTheDocument(); // Selector flexible
    expect(screen.getByText(/Método de Pago/i)).toBeInTheDocument(); // Selector flexible
    expect(screen.getByText(/Resumen del Pedido/i)).toBeInTheDocument(); // Selector flexible
  });

  it('should enable confirm button only when address and payment are selected', () => {
    mockUseCart.mockReturnValue({
      cartItems: [{ cartItemId: '1', name: 'Taco', price: 10, quantity: 1 }],
      itemCount: 1,
      clearCart: mockClearCart,
    });
    renderWithProviders(<CheckoutPage />);
    
    const confirmButton = screen.getByRole('button', { name: /Confirmar Pedido/i });
    expect(confirmButton).toBeDisabled();

    // Select payment method
    fireEvent.click(screen.getByLabelText('Efectivo'));
    
    expect(confirmButton).toBeEnabled();
  });

  it('should place order, clear cart, and redirect on successful submission', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [{ cartItemId: '1', name: 'Taco', price: 10, quantity: 1 }],
      itemCount: 1,
      clearCart: mockClearCart,
    });
    renderWithProviders(<CheckoutPage />);

    // Select payment method
    fireEvent.click(screen.getByLabelText('Efectivo'));
    
    const confirmButton = screen.getByRole('button', { name: /Confirmar Pedido/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/pedidos', expect.any(Object));
      expect(mockClearCart).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/mis-pedidos?order=order-123');
    });
  });
});
