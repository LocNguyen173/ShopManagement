import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type Notification, type Order } from "../types";

type TabId = "inventory" | "orders" | "calendar" | "stats";

type UiState = {
  activeTab: TabId;
  isDrawerOpen: boolean;
  prefilledSku?: string;
  editingOrder: Order | null;
  notification: Notification | null;
  lastBackupAt: string | null;
  isDataLoaded: boolean;
};

const initialState: UiState = {
  activeTab: "inventory",
  isDrawerOpen: false,
  prefilledSku: undefined,
  editingOrder: null,
  notification: null,
  lastBackupAt: null,
  isDataLoaded: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<TabId>) {
      state.activeTab = action.payload;
    },
    openDrawer(
      state,
      action: PayloadAction<{ prefilledSku?: string; editingOrder?: Order }>,
    ) {
      state.isDrawerOpen = true;
      state.prefilledSku = action.payload.prefilledSku;
      state.editingOrder = action.payload.editingOrder || null;
    },
    closeDrawer(state) {
      state.isDrawerOpen = false;
      state.prefilledSku = undefined;
      state.editingOrder = null;
    },
    setNotification(state, action: PayloadAction<Notification | null>) {
      state.notification = action.payload;
    },
    setLastBackupAt(state, action: PayloadAction<string | null>) {
      state.lastBackupAt = action.payload;
    },
    setIsDataLoaded(state, action: PayloadAction<boolean>) {
      state.isDataLoaded = action.payload;
    },
  },
});

export const {
  setActiveTab,
  openDrawer,
  closeDrawer,
  setNotification,
  setLastBackupAt,
  setIsDataLoaded,
} = uiSlice.actions;

export default uiSlice.reducer;
