import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartProvider, useCart } from '@/context/cart-context';
import { useRouter } from 'next/navigation';

// Mock withAuth to return the component directly with a mock user
jest.mock('@/firebase/withAuth', () => ({
  withAuth: (Component: any) => {
    return function MockedComponent(props: any) {
      const mockUser = {
        uid: 'test-user-123',
        email: 'test@test.com',
        getIdToken: jest.fn(() => Promise.resolve('fake-token')),
      };
      const mockClaims = {};
      return <Component {...props} user={mockUser} claims={mockClaims} />;
    };
  },
}));

// Import CheckoutPage AFTER mocking withAuth
let CheckoutPage: any;

// Mock de los hooks y componentes externos
jest.mock('@/context/cart-context', () => ({
  ...jest.requireActual('@/context/cart-context'),
  useCart: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock useUser to return userData with phoneVerified: true
jest.mock('@/firebase/provider', () => ({
  useUser: jest.fn(() => ({
    user: {
      uid: 'test-user-123',
      email: 'test@test.com',
      getIdToken: jest.fn(() => Promise.resolve('fake-token')),
      getIdTokenResult: jest.fn(() => Promise.resolve({ claims: {} })),
    },
    userData: {
      phoneNumber: '+529981234567', // Usuario con teléfono
      phoneVerified: true, // Usuario ya verificado
    },
    isUserLoading: false,
    refreshUserData: jest.fn(() => Promise.resolve()),
  })),
}));

// Mock GooglePlacesAutocompleteWithMap to prevent API errors in JSDOM
jest.mock('@/components/GooglePlacesAutocompleteWithMap', () => {
  return jest.fn(({ onAddressSelect }) => (
    <div data-testid="mock-google-maps">
      <button
        onClick={() =>
          onAddressSelect({
            street: '123 Mock St',
            city: 'Testville',
            state: 'TS',
            postalCode: '12345',
            country: 'Mockland',
            lat: 0,
            lng: 0,
            formattedAddress: '123 Mock St, Testville',
          })
        }
      >
        Select Mock Address
      </button>
    </div>
  ));
});

const mockUseCart = useCart as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

const mockPush = jest.fn();
const mockClearCart = jest.fn();

describe('CheckoutPage', () => {
  beforeAll(() => {
    // Import CheckoutPage after all mocks are set up
    CheckoutPage = require('./page').default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });

    // Mock global fetch with dynamic responses based on URL
    global.fetch = jest.fn((url: string, options?: any) => {
      // Mock for verify-totals endpoint
      if (url === '/api/cart/verify-totals') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ summary: { totalFinal: 10 } }),
        });
      }

      // Mock for create order endpoint
      if (url === '/api/pedidos') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'order-123' }),
        });
      }

      // Default fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should display empty cart message if cart is empty', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [],
      itemCount: 0,
      clearCart: mockClearCart,
    });

    // Mock verify-totals to return 0
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: { totalFinal: 0 } }),
    });

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for the verify-totals call to complete
    await waitFor(() => {
      expect(screen.getByText(/Tu carrito está vacío/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Ir al Menú/i })).toBeInTheDocument();
  });

  it('should render checkout form when cart has items', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [
        {
          cartItemId: '1',
          id: 'prod-1',
          name: 'Taco',
          price: 10,
          quantity: 1,
          isPackage: false,
        }
      ],
      itemCount: 1,
      clearCart: mockClearCart,
    });

    // Mock verify-totals API call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: { totalFinal: 10 } }),
    });

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for verify-totals to complete
    await waitFor(() => {
      expect(screen.getByText('Finalizar Compra')).toBeInTheDocument();
    });

    expect(screen.getByText(/1. Ubicación de Entrega/i)).toBeInTheDocument();
    expect(screen.getByText(/Método de Pago/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen del Pedido/i)).toBeInTheDocument();
  });

  it('should enable confirm button only when address, payment are selected and total is verified', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [
        {
          cartItemId: '1',
          id: 'prod-1',
          name: 'Taco',
          price: 10,
          quantity: 1,
          isPackage: false,
        }
      ],
      itemCount: 1,
      clearCart: mockClearCart,
    });

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for the total to be displayed (means verify-totals completed)
    await waitFor(() => {
      expect(screen.getByText('$10.00')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Find the submit button
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find(btn =>
      btn.textContent?.includes('Confirmar') || btn.textContent?.includes('Verificando')
    );
    expect(confirmButton).toBeDefined();

    // Initially disabled (no payment, no address)
    expect(confirmButton).toBeDisabled();

    // Select payment method
    fireEvent.click(screen.getByLabelText('Efectivo'));

    // Address is still missing, so it should be disabled
    expect(confirmButton).toBeDisabled();

    // Select address via the mock component's button
    fireEvent.click(screen.getByText('Select Mock Address'));

    // Now it should be enabled (wait for state updates)
    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    }, { timeout: 5000 });
  });

  it('should place order, clear cart, and redirect on successful submission', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [
        {
          cartItemId: '1',
          id: 'prod-1',
          name: 'Taco',
          price: 10,
          quantity: 1,
          isPackage: false,
        }
      ],
      itemCount: 1,
      clearCart: mockClearCart,
    });

    // No need to override fetch, the dynamic mock in beforeEach handles everything

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for the total to be displayed (means verify-totals completed)
    await waitFor(() => {
      expect(screen.getByText('$10.00')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Select payment method
    fireEvent.click(screen.getByLabelText('Efectivo'));

    // Select address via the mock component's button
    fireEvent.click(screen.getByText('Select Mock Address'));

    // Find the submit button
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find(btn =>
      btn.textContent?.includes('Confirmar') || btn.textContent?.includes('Verificando')
    );
    expect(confirmButton).toBeDefined();

    // Wait for button to be enabled
    await waitFor(() => {
      expect(confirmButton).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(confirmButton!);

    await waitFor(() => {
      // Verify order creation was called
      expect(global.fetch).toHaveBeenCalledWith('/api/pedidos', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token',
        }),
      }));

      expect(mockClearCart).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/mis-pedidos?order=order-123');
    }, { timeout: 5000 });
  });

  it('should call verify-totals API with correct payload for regular products', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [
        {
          cartItemId: '1',
          id: 'prod-1',
          name: 'Taco',
          price: 10,
          quantity: 2,
          isPackage: false,
          customizations: {
            added: ['Extra Cheese'],
            removed: ['Onions'],
          },
        },
      ],
      itemCount: 1,
      clearCart: mockClearCart,
    });

    // Mock verify-totals API call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: { totalFinal: 20 } }),
    });

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for verify-totals to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cart/verify-totals',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                productId: 'prod-1',
                quantity: 2,
                customizations: {
                  added: ['Extra Cheese'],
                  removed: ['Onions'],
                },
              },
            ],
          }),
        })
      );
    });
  });

  it('should call verify-totals API with correct payload for packages', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [
        {
          cartItemId: '1',
          id: 'package-1',
          name: 'Combo Taco',
          price: 25,
          quantity: 1,
          isPackage: true,
          customizations: { size: 'large' },
        },
      ],
      itemCount: 1,
      clearCart: mockClearCart,
    });

    // Mock verify-totals API call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ summary: { totalFinal: 25 } }),
    });

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for verify-totals to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cart/verify-totals',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              {
                packageId: 'package-1',
                quantity: 1,
                packageCustomizations: { size: 'large' },
              },
            ],
          }),
        })
      );
    });
  });

  it('should use fallback total calculation if verify-totals API fails', async () => {
    mockUseCart.mockReturnValue({
      cartItems: [
        {
          cartItemId: '1',
          id: 'prod-1',
          name: 'Taco',
          price: 10,
          quantity: 2,
          isPackage: false,
        },
      ],
      itemCount: 1,
      clearCart: mockClearCart,
    });

    // Mock verify-totals API to fail
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    );

    // Wait for fallback calculation (price * quantity = 10 * 2 = 20)
    await waitFor(() => {
      expect(screen.getByText('$20.00')).toBeInTheDocument();
    });
  });
});
