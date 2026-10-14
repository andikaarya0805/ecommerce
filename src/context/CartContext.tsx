import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Voucher, Product } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedVariant?: string) => void;
  updateQuantity: (productId: string, delta: number, selectedVariant?: string) => void;
  removeItem: (productId: string, selectedVariant?: string) => void;
  clearCart: () => void;
  appliedVoucher: Voucher | null;
  setAppliedVoucher: (voucher: Voucher | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  totalItemsCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Clear legacy phantom cart key on mount
  useEffect(() => {
    try {
      localStorage.removeItem('jawir_cart');
    } catch {}
  }, []);

  const [items, setItems] = useState<CartItem[]>(() => {
    // If not logged in, guest mode cart starts completely empty!
    const token = localStorage.getItem('token');
    if (!token) return [];
    try {
      const savedUser = localStorage.getItem('user');
      const userId = savedUser ? JSON.parse(savedUser).id : 'auth';
      const saved = localStorage.getItem(`jawir_cart_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart when user logs in or logs out
  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`jawir_cart_${user.id}`);
        setItems(saved ? JSON.parse(saved) : []);
      } catch (e) {
        console.warn('Error loading user cart', e);
      }
    } else {
      // Guest mode: cart resets to clean empty state
      setItems([]);
      setAppliedVoucher(null);
    }
  }, [user?.id]);

  // Persist items only for logged-in user
  useEffect(() => {
    if (user?.id) {
      try {
        localStorage.setItem(`jawir_cart_${user.id}`, JSON.stringify(items));
      } catch (e) {
        console.warn('Failed to save cart to localStorage', e);
      }
    }
  }, [items, user?.id]);

  const addToCart = (product: Product, quantity = 1, selectedVariant?: string) => {
    setItems((prev) => {
      const variantKey = selectedVariant?.trim() || '';
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && (item.selectedVariant?.trim() || '') === variantKey
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedVariant: variantKey || undefined }];
    });
  };

  const updateQuantity = (productId: string, delta: number, selectedVariant?: string) => {
    setItems((prev) =>
      prev
        .map((item) => {
          const matchVariant = selectedVariant === undefined || (item.selectedVariant?.trim() || '') === (selectedVariant?.trim() || '');
          if (item.product.id === productId && matchVariant) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string, selectedVariant?: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        if (item.product.id !== productId) return true;
        if (selectedVariant !== undefined) {
          return (item.selectedVariant?.trim() || '') !== (selectedVariant?.trim() || '');
        }
        return false;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedVoucher(null);
    localStorage.removeItem('jawir_cart');
    localStorage.removeItem('jawir_voucher');
  };

  const totalItemsCount = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        appliedVoucher,
        setAppliedVoucher,
        isCartOpen,
        setIsCartOpen,
        totalItemsCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
