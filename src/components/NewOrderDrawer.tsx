import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  type InventoryItem,
  type Order,
  type OrderItemLine,
  type OrderStatus,
  type RefundStatus,
  getOrderSkus,
} from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { addOrder, updateOrder } from "../slices/ordersSlice";
import { updateItemStatus } from "../slices/inventorySlice";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefilledSku?: string;
  editingOrder?: Order;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

// Khởi tạo giá trị mặc định ban đầu
const initialFormState: Partial<Order> = {
  customerName: "",
  phone: "",
  itemSkus: [],
  rentPrices: [],
  rentDiscountPercents: [],
  startDate: getTodayDateString(), // Đảm bảo đúng ngày cục bộ hôm nay
  dueDate: "",
  rentPrice: 0,
  depositReceived: 0,
  status: "Chờ lấy đồ",
  refundStatus: "Chưa trả cọc",
  bookingType: "Tự động",
  penalty: 0,
  penaltyReason: "",
  note: "",
};

export const NewOrderDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  prefilledSku,
  editingOrder,
  showNotification,
}) => {
  const dispatch = useAppDispatch();
  const inventory: InventoryItem[] = useAppSelector(
    (state) => state.inventory.items,
  );
  const orders: Order[] = useAppSelector((state) => state.orders.orders);
  const [formData, setFormData] = useState<Partial<Order>>(initialFormState);
  const [isDepositManual, setIsDepositManual] = useState(false);
  const [itemQuery, setItemQuery] = useState("");
  const [isItemListOpen, setIsItemListOpen] = useState(false);

  const getAutoDeposit = useCallback(
    (sku: string) => {
      const item = inventory.find((i) => i.sku === sku);
      const baseDeposit = item?.deposit ?? 0;
      if (!baseDeposit) return 0;
      const orderCount = orders.filter((o) =>
        getOrderSkus(o).includes(sku),
      ).length;
      const factor = Math.max(0.5, 1 - 0.1 * orderCount);
      return Math.round(baseDeposit * factor);
    },
    [inventory, orders],
  );
  const buildItemLine = useCallback(
    (sku: string, overrides: Partial<OrderItemLine> = {}) => {
      const item = inventory.find((current) => current.sku === sku);
      return {
        sku,
        name: item?.name || "",
        rentPrice: item?.price || 0,
        deposit: getAutoDeposit(sku),
        discountPercent: 0,
        ...overrides,
      };
    },
    [inventory, getAutoDeposit],
  );
  const getCurrentLines = useCallback(
    (current: Partial<Order>) => {
      if (current.itemLines && current.itemLines.length > 0) {
        return current.itemLines;
      }
      const skus = current.itemSkus || [];
      return skus.map((sku) => buildItemLine(sku));
    },
    [buildItemLine],
  );
  const applyLines = useCallback(
    (lines: OrderItemLine[]) => {
      const rentTotal = lines.reduce((sum, line) => sum + line.rentPrice, 0);
      const depositTotal = lines.reduce((sum, line) => sum + line.deposit, 0);
      setFormData((current) => ({
        ...current,
        itemLines: lines,
        itemSkus: lines.map((line) => line.sku),
        rentPrices: lines.map((line) => line.rentPrice),
        rentDiscountPercents: lines.map((line) => line.discountPercent || 0),
        rentPrice: rentTotal,
        depositReceived: depositTotal,
      }));
    },
    [setFormData],
  );
  useEffect(() => {
    if (isOpen) {
      if (editingOrder) {
        // Đặt lại dữ liệu của đơn hàng cần chỉnh sửa
        setTimeout(() => {
          setIsDepositManual(true);
          const orderSkus = getOrderSkus(editingOrder);
          const orderLines =
            editingOrder.itemLines && editingOrder.itemLines.length > 0
              ? editingOrder.itemLines
              : orderSkus.map((sku) => buildItemLine(sku));
          setFormData({
            ...initialFormState,
            ...editingOrder,
            itemSkus: orderSkus,
            itemLines: orderLines,
            rentPrices: orderLines.map((line) => line.rentPrice),
            rentDiscountPercents: orderLines.map(
              (line) => line.discountPercent || 0,
            ),
            rentPrice: orderLines.reduce(
              (sum, line) => sum + line.rentPrice,
              0,
            ),
            depositReceived: orderLines.reduce(
              (sum, line) => sum + line.deposit,
              0,
            ),
          });
          setItemQuery("");
        });
      } else if (prefilledSku) {
        const line = buildItemLine(prefilledSku);
        setTimeout(() => {
          setIsDepositManual(false);
          setFormData({
            ...initialFormState,
            itemSkus: [prefilledSku],
            itemLines: [line],
            rentPrices: [line.rentPrice],
            rentDiscountPercents: [line.discountPercent || 0],
            rentPrice: line.rentPrice,
            depositReceived: line.deposit,
          });
          setItemQuery("");
        });
      } else {
        // Reset form về trạng thái trống khi lập đơn mới hoàn toàn
        setTimeout(() => {
          setIsDepositManual(false);
          setFormData(initialFormState);
          setItemQuery("");
        });
      }
    }
  }, [
    isOpen,
    editingOrder,
    prefilledSku,
    inventory,
    getAutoDeposit,
    buildItemLine,
  ]);

  const selectedSkus = useMemo(() => {
    if (formData.itemLines && formData.itemLines.length > 0) {
      return formData.itemLines.map((line) => line.sku);
    }
    return formData.itemSkus || [];
  }, [formData.itemLines, formData.itemSkus]);

  const filteredInventory = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    return inventory.filter((item) => {
      const isAvailable =
        item.status === "Sẵn sàng" || selectedSkus.includes(item.sku);
      if (!isAvailable) return false;
      if (selectedSkus.includes(item.sku)) return false;
      if (!query) return true;
      return (
        item.sku.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
    });
  }, [inventory, itemQuery, selectedSkus]);
  const selectedItems = useMemo(() => {
    if (formData.itemLines && formData.itemLines.length > 0) {
      return formData.itemLines;
    }
    return selectedSkus.map((sku) => buildItemLine(sku));
  }, [formData.itemLines, selectedSkus, buildItemLine]);

  console.log("Selected Items:", selectedItems);
  const showItemBreakdown = selectedItems.length >= 2;
  const rentDiscountedTotal = selectedItems.reduce((sum, line) => {
    const discount = line.discountPercent || 0;
    const discounted = Math.round(line.rentPrice * (1 - discount / 100));
    return sum + discounted;
  }, 0);
  const totalValue = rentDiscountedTotal + (formData.penalty || 0);
  const handleItemLineChange = (sku: string, patch: Partial<OrderItemLine>) => {
    setFormData((current) => {
      const currentLines = getCurrentLines(current);
      const nextLines = currentLines.map((line) =>
        line.sku === sku ? { ...line, ...patch } : line,
      );
      const rentTotal = nextLines.reduce(
        (sum, line) => sum + line.rentPrice,
        0,
      );
      const depositTotal = nextLines.reduce(
        (sum, line) => sum + line.deposit,
        0,
      );
      return {
        ...current,
        itemLines: nextLines,
        itemSkus: nextLines.map((line) => line.sku),
        rentPrices: nextLines.map((line) => line.rentPrice),
        rentDiscountPercents: nextLines.map(
          (line) => line.discountPercent || 0,
        ),
        rentPrice: rentTotal,
        depositReceived: depositTotal,
      };
    });
  };
  const handleClose = () => {
    if (formData.customerName || selectedSkus.length > 0) {
      onClose();
      setTimeout(() => {
        setFormData(initialFormState);
      }, 300);
    } else {
      onClose();
    }
  };
  const handleSubmit = () => {
    if (
      !formData.customerName ||
      selectedSkus.length === 0 ||
      !formData.dueDate
    ) {
      showNotification("Vui lòng điền đầy đủ thông tin bắt buộc", "error");
      return;
    }
    if (formData.dueDate < (formData.startDate || "")) {
      showNotification("Ngày trả đồ không thể trước ngày nhận đồ", "error");
      return;
    }
    if (editingOrder) {
      const updatedOrder: Order = {
        ...editingOrder,
        ...formData,
        itemSkus: selectedSkus,
        itemLines: showItemBreakdown ? selectedItems : undefined,
        rentPrices: selectedItems.map((line) => line.rentPrice),
        rentDiscountPercents: selectedItems.map(
          (line) => line.discountPercent || 0,
        ),
      } as Order;
      dispatch(updateOrder(updatedOrder));
      showNotification(`Đã cập nhật đơn ${editingOrder.id}`, "success");
    } else {
      const id = `DH-${Math.floor(Math.random() * 900 + 100)}`;
      const order: Order = {
        id,
        customerName: formData.customerName!,
        phone: formData.phone || "",
        itemSkus: selectedSkus,
        itemLines: showItemBreakdown ? selectedItems : undefined,
        rentPrices: selectedItems.map((line) => line.rentPrice),
        rentDiscountPercents: selectedItems.map(
          (line) => line.discountPercent || 0,
        ),
        startDate: formData.startDate!,
        dueDate: formData.dueDate!,
        status: (formData.status as OrderStatus) || "Chờ lấy đồ",
        rentPrice: Math.max(0, Number(formData.rentPrice)) || 0,
        depositReceived: Math.max(0, Number(formData.depositReceived)) || 0,
        refundStatus: (formData.refundStatus as RefundStatus) || "Chưa trả cọc",
        penalty: Math.max(0, Number(formData.penalty)) || 0,
        penaltyReason: formData.penaltyReason || "",
        note: formData.note || "",
        bookingType: "Tự động",
      };
      dispatch(addOrder(order));
      if (order.status === "Đang thuê") {
        order.itemSkus.forEach((sku) => {
          const item = inventory.find((i) => i.sku === sku);
          if (item) {
            dispatch(
              updateItemStatus({ id: item.id, status: "Khách đang giữ" }),
            );
          }
        });
      }
      showNotification(`Đã tạo đơn ${id} thành công`, "success");
    }
    onClose();
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 350 }}
            className="relative w-full max-w-[480px] h-full bg-[#141414] border-l border-white/10 flex flex-col">
            {/* Header */}
            <div className="px-8 py-8 border-b border-white/10 flex justify-between items-center bg-[#101010]">
              <div>
                <h3 className="font-black text-2xl tracking-tighter text-white">
                  {editingOrder ? "Sửa Đơn Hàng" : "Lập Đơn Thuê Đồ"}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10">
                <span className="material-symbols-outlined text-white/70 text-[20px]">
                  close
                </span>
              </button>
            </div>
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto dark-scrollbar px-8 py-8 space-y-8 pb-32">
              {/* Customer Section */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Thông tin khách hàng
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Họ tên khách"
                    value={formData.customerName}
                    onChange={(v) =>
                      setFormData({ ...formData, customerName: v })
                    }
                    placeholder="VD: Nguyễn Văn A"
                  />
                  <InputField
                    label="Số điện thoại"
                    value={formData.phone}
                    onChange={(v) => setFormData({ ...formData, phone: v })}
                    placeholder="09xxxxxx"
                  />
                </div>
              </div>
              {/* Product Section */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Sản phẩm & Lịch
                </h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                      Chọn trang phục
                    </label>
                    <div className="relative">
                      <input
                        value={itemQuery}
                        disabled={!!editingOrder}
                        placeholder="Tìm theo SKU hoặc tên..."
                        onChange={(e) => {
                          setItemQuery(e.target.value);
                          setIsItemListOpen(true);
                        }}
                        onFocus={() => setIsItemListOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsItemListOpen(false), 150);
                        }}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5 text-[13px] text-white outline-none focus:border-white/20 transition-all font-black tracking-widest disabled:opacity-40"
                      />
                      {selectedSkus.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedSkus.map((sku) => {
                            const item = inventory.find((i) => i.sku === sku);
                            return (
                              <div
                                key={sku}
                                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/70">
                                <span>
                                  {sku}
                                  {item?.name ? ` — ${item.name}` : ""}
                                </span>
                                {!editingOrder && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextLines = selectedItems.filter(
                                        (line) => line.sku !== sku,
                                      );
                                      applyLines(nextLines);
                                    }}
                                    className="rounded-full border border-white/10 bg-white/10 px-1.5 text-[10px] text-white/70 hover:text-white">
                                    ×
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isItemListOpen && !editingOrder && (
                        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#101010] shadow-2xl">
                          {filteredInventory.length === 0 ? (
                            <div className="px-5 py-4 text-[11px] text-white/40 font-bold">
                              Không tìm thấy trang phục phù hợp
                            </div>
                          ) : (
                            filteredInventory.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  const nextLines = [
                                    ...selectedItems,
                                    buildItemLine(item.sku),
                                  ];
                                  applyLines(nextLines);
                                  setItemQuery("");
                                  setIsItemListOpen(false);
                                }}
                                className="w-full text-left px-5 py-3 text-[12px] font-black tracking-widest text-white/80 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="h-8 w-8 rounded-lg object-cover border border-white/10"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/30">
                                      N/A
                                    </div>
                                  )}
                                  <span>
                                    {item.sku} — {item.name}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Ngày nhận đồ"
                      type="date"
                      value={formData.startDate}
                      onChange={(v) =>
                        setFormData({ ...formData, startDate: v })
                      }
                    />
                    <InputField
                      label="Ngày hẹn trả"
                      type="date"
                      value={formData.dueDate}
                      onChange={(v) => setFormData({ ...formData, dueDate: v })}
                    />
                  </div>
                </div>
              </div>
              {/* Finance Section */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Chi phí thuê
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Giá thuê (đ)"
                    type="number"
                    value={formData.rentPrice}
                    onChange={(v) => {
                      if (showItemBreakdown) return;
                      setFormData({ ...formData, rentPrice: Number(v) });
                    }}
                    className={
                      showItemBreakdown ? "opacity-70 cursor-not-allowed" : ""
                    }
                  />
                  {!showItemBreakdown && selectedItems.length === 1 && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-white font-black uppercase tracking-widest ml-1">
                        Giảm giá (%)
                      </label>
                      <select
                        value={selectedItems[0]?.discountPercent || 0}
                        onChange={(e) =>
                          handleItemLineChange(selectedItems[0].sku, {
                            discountPercent: Number(e.target.value),
                          })
                        }
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[12px] text-white outline-none focus:border-white/20 transition-all font-black tracking-widest">
                        {[0, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(
                          (percent) => (
                            <option
                              key={percent}
                              value={percent}
                              className="bg-[#1a1a1a]">
                              {percent}%
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-white font-black uppercase tracking-widest ml-1">
                        Tiền cọc (đ)
                      </label>
                      {!editingOrder && !showItemBreakdown && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDepositManual((prev) => {
                              const next = !prev;
                              if (!next) {
                                const autoDeposit = selectedSkus.reduce(
                                  (sum, sku) => sum + getAutoDeposit(sku),
                                  0,
                                );
                                setFormData((current) => ({
                                  ...current,
                                  depositReceived: autoDeposit,
                                }));
                              }
                              return next;
                            });
                          }}
                          className="text-[8px] font-black uppercase tracking-widest text-white/50 hover:text-white/80 transition-colors">
                          {isDepositManual ? "Tự động" : "Tự nhập"}
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      value={formData.depositReceived}
                      onChange={(e) => {
                        if (showItemBreakdown) return;
                        setIsDepositManual(true);
                        setFormData({
                          ...formData,
                          depositReceived: Number(e.target.value),
                        });
                      }}
                      readOnly={
                        showItemBreakdown || (!editingOrder && !isDepositManual)
                      }
                      className={`w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-white/20 transition-all placeholder:text-white/4 font-bold ${
                        showItemBreakdown || (!editingOrder && !isDepositManual)
                          ? "opacity-60 cursor-not-allowed"
                          : ""
                      }`}
                    />
                  </div>
                </div>
                {showItemBreakdown && (
                  <div className="space-y-2">
                    <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.2em] ml-1">
                      Chi tiết theo món
                    </p>
                    <div className="space-y-2">
                      {selectedItems.map((item) => (
                        <div
                          key={item.sku}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-bold text-white/70">
                          <div className="flex flex-col">
                            <span className="font-black text-white/80">
                              {item.sku}
                            </span>
                            {item.name && (
                              <span className="text-[10px] text-white/40">
                                {item.name}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-white/50">Thuê</span>
                              <input
                                type="number"
                                value={item.rentPrice}
                                onChange={(e) =>
                                  handleItemLineChange(item.sku, {
                                    rentPrice: Number(e.target.value),
                                  })
                                }
                                className="w-24 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
                              />
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-white/50">
                              <span>Giảm</span>
                              <select
                                value={item.discountPercent || 0}
                                onChange={(e) =>
                                  handleItemLineChange(item.sku, {
                                    discountPercent: Number(e.target.value),
                                  })
                                }
                                className="w-24 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-white/30">
                                {[0, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(
                                  (percent) => (
                                    <option
                                      key={percent}
                                      value={percent}
                                      className="bg-[#1a1a1a]">
                                      {percent}%
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-white/50">
                              <span>Cọc</span>
                              <input
                                type="number"
                                value={item.deposit}
                                onChange={(e) => {
                                  setIsDepositManual(true);
                                  handleItemLineChange(item.sku, {
                                    deposit: Number(e.target.value),
                                  });
                                }}
                                className="w-24 bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-white/30"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Trạng thái & Ghi chú
                </h4>
                <div className="space-y-2">
                  <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                    Trạng thái đơn
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as OrderStatus,
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-[13px] text-white outline-none focus:border-white/20 transition-all font-black tracking-widest">
                    <option value="Chờ lấy đồ" className="bg-[#1a1a1a]">
                      Chờ lấy đồ
                    </option>
                    <option value="Đang thuê" className="bg-[#1a1a1a]">
                      Đang thuê
                    </option>
                    <option value="Quá hạn" className="bg-[#1a1a1a]">
                      Quá hạn
                    </option>
                    <option
                      value="Đã trả - Hoàn thành"
                      className="bg-[#1a1a1a]">
                      Đã trả - Hoàn thành
                    </option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                    Ghi chú đơn hàng
                  </label>
                  <textarea
                    value={formData.note || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-[13px] text-white outline-none focus:border-white/20 transition-all placeholder:text-white/4 font-bold min-h-[90px] resize-none"
                    placeholder="Ghi chú thêm cho đơn hàng..."
                  />
                </div>
              </div>
              {/* Edit Only Fields */}
              {editingOrder && (
                <div className="space-y-4 pt-4 border-t border-white/5 animate-fade">
                  <h4 className="text-[9px] uppercase font-black text-rose-400/70 tracking-[0.25em] ml-1">
                    Phát sinh
                  </h4>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Phí phạt (đ)"
                        type="number"
                        value={formData.penalty}
                        className="text-rose-400"
                        onChange={(v) =>
                          setFormData({ ...formData, penalty: Number(v) })
                        }
                      />
                      <InputField
                        label="Lý do phạt"
                        value={formData.penaltyReason}
                        onChange={(v) =>
                          setFormData({ ...formData, penaltyReason: v })
                        }
                        placeholder="Trễ ngày, hư hỏng..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Actions Footer */}
            <div className="mt-auto p-8 bg-[#101010] border-t border-white/10 space-y-4">
              <div className="flex items-center justify-between px-5 py-4 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">
                    Tổng thanh toán
                  </p>
                  <p className="text-xl font-black tracking-tighter text-white">
                    {totalValue.toLocaleString()}đ
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">
                    Đã nhận cọc
                  </p>
                  <p className="text-sm font-bold text-white/80">
                    {(formData.depositReceived || 0).toLocaleString()}đ
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 text-[10px] font-black bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/70 uppercase tracking-widest">
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-[2] py-4 text-[10px] font-black bg-white text-black rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] uppercase tracking-widest">
                  Xác Nhận
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
const InputField: React.FC<{
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  className = "",
}) => (
  <div className="space-y-1.5">
    <label className="text-[9px] text-white font-black uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-white/20 transition-all placeholder:text-white/4 font-bold ${className}`}
      placeholder={placeholder}
    />
  </div>
);
