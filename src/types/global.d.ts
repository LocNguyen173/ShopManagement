export {};

declare global {
  interface Window {
    shopStorage?: {
      getData: () => Promise<{
        inventory: import("../types").InventoryItem[];
        orders: import("../types").Order[];
      } | null>;
      saveData: (data: {
        inventory: import("../types").InventoryItem[];
        orders: import("../types").Order[];
      }) => Promise<void>;
    };
  }
}
