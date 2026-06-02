import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import inventoryReducer from "./slices/inventorySlice";
import ordersReducer from "./slices/ordersSlice";
import uiReducer from "./slices/uiSlice";
import { updateOrderStatus } from "./slices/ordersSlice";
import { updateItemStatus } from "./slices/inventorySlice";
import { type InventoryItem, type Order, getOrderSkus } from "./types";

const orderStatusListener = createListenerMiddleware();

orderStatusListener.startListening({
  actionCreator: updateOrderStatus,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState() as {
      orders: { orders: Order[] };
      inventory: { items: InventoryItem[] };
    };
    const order = state.orders.orders.find(
      (current) => current.id === action.payload.id,
    );
    if (!order) return;
    const orderSkus = getOrderSkus(order);
    if (orderSkus.length === 0) return;
    const nextStatus =
      action.payload.status === "Đã trả - Hoàn thành"
        ? "Sẵn sàng"
        : "Khách đang giữ";
    orderSkus.forEach((sku) => {
      const item = state.inventory.items.find((current) => current.sku === sku);
      if (!item || item.status === nextStatus) return;
      listenerApi.dispatch(
        updateItemStatus({ id: item.id, status: nextStatus }),
      );
    });
  },
});

export const store = configureStore({
  reducer: {
    inventory: inventoryReducer,
    orders: ordersReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(orderStatusListener.middleware),
});
