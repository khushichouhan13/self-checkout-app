import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cartItems: localStorage.getItem('cartItems')
    ? JSON.parse(localStorage.getItem('cartItems'))
    : [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload; // { product, name, price, image, stock }
      const existItem = state.cartItems.find((x) => x.product === item.product);

      if (existItem) {
        // Only increment if we haven't reached stock capacity
        if (existItem.quantity < item.stock) {
          existItem.quantity += 1;
        } else {
          // Trigger a notification or cap it
          existItem.quantity = item.stock;
        }
      } else {
        state.cartItems.push({ ...item, quantity: 1 });
      }

      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    updateQuantity: (state, action) => {
      const { product, quantity } = action.payload;
      const existItem = state.cartItems.find((x) => x.product === product);

      if (existItem) {
        // Cap quantity to stock, and set minimum to 1
        const cleanQuantity = Math.max(1, Math.min(existItem.stock, quantity));
        existItem.quantity = cleanQuantity;
      }

      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter((x) => x.product !== action.payload);
      localStorage.setItem('cartItems', JSON.stringify(state.cartItems));
    },
    clearCart: (state) => {
      state.cartItems = [];
      localStorage.removeItem('cartItems');
    },
  },
});

export const { addToCart, updateQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
