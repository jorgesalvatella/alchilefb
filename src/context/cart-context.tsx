'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import type { SaleProduct } from '@/lib/data';

// Define the shape of a single cart item
export interface CartItem extends SaleProduct {
  quantity: number;
}

// Define the shape of the context
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: SaleProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
}

// Create the context with a default undefined value
const CartContext = createContext<CartContextType | undefined>(undefined);

// Define the props for the provider component
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Effect to load cart from localStorage on initial client-side render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('alchile-cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      setIsInitialLoad(false);
    }
  }, []);

  // Effect to save cart to localStorage whenever it changes
  useEffect(() => {
    // Don't save during the initial load from localStorage
    if (!isInitialLoad) {
      localStorage.setItem('alchile-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isInitialLoad]);

  const addToCart = (product: SaleProduct) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const itemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to use the CartContext
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
