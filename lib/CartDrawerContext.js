// lib/CartDrawerContext.js
'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

const CartDrawerContext = createContext({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {}
});

export function CartDrawerProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(x => !x), []);

  return (
    <CartDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  return useContext(CartDrawerContext);
}
