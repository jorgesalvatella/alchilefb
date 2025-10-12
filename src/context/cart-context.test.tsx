import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './cart-context';
import { CartItem } from '@/lib/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock the toast function directly as it's a named export used by the context
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;

const productA: CartItem = { id: 'prod1', name: 'Taco', price: 20, quantity: 1 };

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should add a simple item to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(productA);
    });
    expect(result.current.cartItems.length).toBe(1);
    expect(result.current.cartItems[0].id).toBe('prod1');
    expect(result.current.itemCount).toBe(1);
  });

  it('should increase quantity if the same simple item is added again', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addItem(productA);
    });
    act(() => {
      result.current.addItem(productA);
    });
    expect(result.current.cartItems.length).toBe(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
  });

  it('should add a customized item as a new entry', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const customizedItem: CartItem = { ...productA, customizations: { added: ['Queso'], removed: [] } };
    act(() => {
      result.current.addItem(customizedItem);
    });
    expect(result.current.cartItems.length).toBe(1);
    expect(result.current.cartItems[0].customizations?.added).toEqual(['Queso']);
  });

  it('should increase quantity if an identically customized item is added', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const customizedItem: CartItem = { ...productA, customizations: { added: ['Queso'], removed: [] } };
    act(() => {
      result.current.addItem(customizedItem);
    });
    act(() => {
      result.current.addItem(customizedItem);
    });
    expect(result.current.cartItems.length).toBe(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('should add a new item if the same product has different customizations', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const item1: CartItem = { ...productA, customizations: { added: ['Queso'], removed: [] } };
    const item2: CartItem = { ...productA, customizations: { added: ['Aguacate'], removed: [] } };
    act(() => {
      result.current.addItem(item1);
    });
    act(() => {
      result.current.addItem(item2);
    });
    expect(result.current.cartItems.length).toBe(2);
    expect(result.current.itemCount).toBe(2);
  });
});