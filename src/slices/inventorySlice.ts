import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type InventoryItem, type ItemStatus } from "../types";

type InventoryState = {
  items: InventoryItem[];
};

const initialState: InventoryState = {
  items: [],
};

export const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    setItems(state, action: PayloadAction<InventoryItem[]>) {
      state.items = action.payload;
    },
    addItem(state, action: PayloadAction<InventoryItem>) {
      state.items.unshift(action.payload);
    },
    updateItem(state, action: PayloadAction<InventoryItem>) {
      state.items = state.items.map((item) =>
        item.id === action.payload.id ? action.payload : item,
      );
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateItemStatus(
      state,
      action: PayloadAction<{ id: string; status: ItemStatus }>,
    ) {
      state.items = state.items.map((item) =>
        item.id === action.payload.id
          ? { ...item, status: action.payload.status }
          : item,
      );
    },
    updateItemImage(
      state,
      action: PayloadAction<{ id: string; imageUrl?: string }>,
    ) {
      state.items = state.items.map((item) =>
        item.id === action.payload.id
          ? { ...item, imageUrl: action.payload.imageUrl || "" }
          : item,
      );
    },
    clearInventory(state) {
      state.items = [];
    },
  },
});

export const {
  setItems,
  addItem,
  updateItem,
  removeItem,
  updateItemStatus,
  updateItemImage,
  clearInventory,
} = inventorySlice.actions;

export default inventorySlice.reducer;
