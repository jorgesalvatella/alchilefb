'use client';

import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import type { CartItem as CartItemType } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

// Define the shape of a single cart item, adding a unique cart-specific ID
export interface CartItem extends CartItemType {
  cartItemId: string; 
}

// Define the shape of the context
interface CartContextType {
  cartItems: CartItem[];
  addItem: (item: CartItemType) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
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
    if (!isInitialLoad) {
      localStorage.setItem('alchile-cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isInitialLoad]);

  const addItem = (itemToAdd: CartItemType) => {
    setCartItems(prevItems => {
      // Check for an identical item (same ID and same customizations)
      const existingItem = prevItems.find(item => 
        item.id === itemToAdd.id &&
        JSON.stringify(item.customizations) === JSON.stringify(itemToAdd.customizations)
      );

      if (existingItem) {
        // If found, just increase quantity
        return prevItems.map(item =>
          item.cartItemId === existingItem.cartItemId 
            ? { ...item, quantity: item.quantity + itemToAdd.quantity } 
            : item
        );
      } else {
        // If not found, add as a new item with a unique cartItemId
        const newCartItem: CartItem = {
          ...itemToAdd,
          cartItemId: `${itemToAdd.id}_${Date.now()}`
        };
        return [...prevItems, newCartItem];
      }
    });
    toast({
      title: '¡Añadido al carrito!',
      description: `${itemToAdd.quantity} x ${itemToAdd.name} se ha añadido a tu pedido.`,
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.cartItemId === cartItemId ? { ...item, quantity } : item
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
    addItem,
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
