import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Order, type OrderStatus, type RefundStatus } from "../types";

type OrdersState = {
  orders: Order[];
};

const initialState: OrdersState = {
  orders: [],
};

export const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrders(state, action: PayloadAction<Order[]>) {
      state.orders = action.payload;
    },
    addOrder(state, action: PayloadAction<Order>) {
      state.orders.unshift(action.payload);
    },
    updateOrder(state, action: PayloadAction<Order>) {
      state.orders = state.orders.map((order) =>
        order.id === action.payload.id ? action.payload : order,
      );
    },
    removeOrder(state, action: PayloadAction<string>) {
      state.orders = state.orders.filter(
        (order) => order.id !== action.payload,
      );
    },
    updateOrderStatus(
      state,
      action: PayloadAction<{ id: string; status: OrderStatus }>,
    ) {
      state.orders = state.orders.map((order) =>
        order.id === action.payload.id
          ? { ...order, status: action.payload.status }
          : order,
      );
    },
    updateRefundStatus(
      state,
      action: PayloadAction<{ id: string; refundStatus: RefundStatus }>,
    ) {
      state.orders = state.orders.map((order) =>
        order.id === action.payload.id
          ? { ...order, refundStatus: action.payload.refundStatus }
          : order,
      );
    },
    updateOrderNote(
      state,
      action: PayloadAction<{ id: string; note: string }>,
    ) {
      state.orders = state.orders.map((order) =>
        order.id === action.payload.id
          ? { ...order, note: action.payload.note }
          : order,
      );
    },
    clearOrders(state) {
      state.orders = [];
    },
  },
});

export const {
  setOrders,
  addOrder,
  updateOrder,
  removeOrder,
  updateOrderStatus,
  updateRefundStatus,
  updateOrderNote,
  clearOrders,
} = ordersSlice.actions;

export default ordersSlice.reducer;
