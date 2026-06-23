import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  type: 'SIM' | 'PLAN';
  price: number;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: { id: string; name: string; type: 'SIM' | 'PLAN'; price: number }) => void;
  removeFromCart: (itemId: string, type: 'SIM' | 'PLAN') => void;
  updateQuantity: (itemId: string, type: 'SIM' | 'PLAN', quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shopping_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('shopping_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: { id: string; name: string; type: 'SIM' | 'PLAN'; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === item.id && x.type === item.type);
      if (existing) {
        return prev.map((x) =>
          x.id === item.id && x.type === item.type ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string, type: 'SIM' | 'PLAN') => {
    setCart((prev) => prev.filter((x) => !(x.id === itemId && x.type === type)));
  };

  const updateQuantity = (itemId: string, type: 'SIM' | 'PLAN', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId, type);
      return;
    }
    setCart((prev) =>
      prev.map((x) => (x.id === itemId && x.type === type ? { ...x, quantity } : x))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
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
