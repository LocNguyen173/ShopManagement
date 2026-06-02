export type ItemStatus =
  | "Sẵn sàng"
  | "Khách đang giữ"
  | "Đang giặt ủi"
  | "Đang sửa chữa";

export type OrderStatus =
  | "Chờ lấy đồ"
  | "Đang thuê"
  | "Đã trả - Hoàn thành"
  | "Quá hạn";

export type RefundStatus = "Chưa trả cọc" | "Đã trả cọc";

export type BookingType = "Tự động" | "Chưa đặt";

export interface InventoryItem {
  id: string;

  sku: string; // This is the unique identifier for the item

  name: string;

  type: string;

  size: string;

  price: number;

  deposit: number;

  status: ItemStatus;

  note: string;

  imageUrl?: string;
}

export interface Order {
  id: string;

  customerName: string;

  phone: string;

  itemSkus: string[];

  itemSku?: string;

  itemLines?: OrderItemLine[];

  startDate: string;

  dueDate: string;

  status: OrderStatus;

  rentPrice: number;

  rentPrices?: number[];

  rentDiscountPercents?: number[];

  depositReceived: number;

  refundStatus: RefundStatus;

  penalty: number;

  penaltyReason: string;

  note: string;

  bookingType: BookingType;
}

export interface OrderItemLine {
  sku: string;
  name?: string;
  rentPrice: number;
  deposit: number;
  discountPercent?: number;
}

export const getOrderSkus = (order: Order): string[] => {
  if (Array.isArray(order.itemLines) && order.itemLines.length > 0) {
    return order.itemLines.map((line) => line.sku);
  }
  if (Array.isArray(order.itemSkus) && order.itemSkus.length > 0) {
    return order.itemSkus;
  }
  return order.itemSku ? [order.itemSku] : [];
};

export interface Notification {
  message: string;

  type: "success" | "error" | "info";
}
