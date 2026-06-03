import React, { useState, useEffect, useMemo, useCallback } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { vi } from "date-fns/locale/vi";
import "react-datepicker/dist/react-datepicker.css";
import {
  type Order,
  type OrderStatus,
  type InventoryItem,
  type RefundStatus,
  getOrderSkus,
} from "../types";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import {
  setOrders as setOrdersState,
  updateOrderStatus as updateOrderStatusState,
  updateRefundStatus,
  removeOrder,
} from "../slices/ordersSlice";
import { updateItemStatus } from "../slices/inventorySlice";
interface Props {
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}
const STATUS_BADGES: Record<OrderStatus, string> = {
  "Chờ lấy đồ": "bg-yellow-500/20 text-yellow-600 border-yellow-500/20",
  "Đang thuê": "bg-sky-500/15 text-sky-400 border-sky-500/20",
  "Đã trả - Hoàn thành":
    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Quá hạn": "bg-rose-500/15 text-rose-400 border-rose-500/20",
};

registerLocale("vi", vi);

const getLocalDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

const formatLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

const parseLocalDateString = (value: string) => {
  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
};
export const OrdersTab: React.FC<Props> = ({
  onNewOrder,
  onEditOrder,
  showNotification,
}) => {
  const ROWS_PER_PAGE = 10;
  const dispatch = useAppDispatch();
  const orders: Order[] = useAppSelector((state) => state.orders.orders);

  const inventory: InventoryItem[] = useAppSelector(
    (state) => state.inventory.items,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "Tất cả">(
    "Tất cả",
  );
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<
    "none" | "day" | "month" | "year"
  >("none");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const today = getLocalDateString();
    let hasChanges = false;
    const updated = orders.map((order) => {
      if (
        order.status !== "Đã trả - Hoàn thành" &&
        order.dueDate < today &&
        order.status !== "Quá hạn"
      ) {
        hasChanges = true;
        return { ...order, status: "Quá hạn" as OrderStatus };
      }
      return order;
    });
    if (hasChanges) {
      dispatch(setOrdersState(updated));
    }
  }, [orders, dispatch]);
  const getOrderDaysRented = useCallback((order: Order) => {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const start = new Date(order.startDate);
    const due = new Date(order.dueDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
      return 0;
    }
    const diff = Math.ceil((due.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    return Math.max(0, diff);
  }, []);
  const getOrderRentTotal = useCallback(
    (order: Order) => {
      const days = getOrderDaysRented(order);
      const daySurcharge = Math.max(0, days - 1) * 10000;
      if (order.rentPrices && order.rentPrices.length > 0) {
        const discounts = order.rentDiscountPercents || [];
        return (
          order.rentPrices.reduce((sum, price, idx) => {
            const discount = discounts[idx] || 0;
            const discounted = Math.round(price * (1 - discount / 100));
            return sum + discounted;
          }, 0) +
          order.rentPrices.length * daySurcharge
        );
      }
      if (order.itemLines && order.itemLines.length > 0) {
        return order.itemLines.reduce((sum, line) => {
          const discount = line.discountPercent || 0;
          const discounted = Math.round(line.rentPrice * (1 - discount / 100));
          return sum + discounted + daySurcharge;
        }, 0);
      }
      return order.rentPrice + daySurcharge;
    },
    [getOrderDaysRented],
  );
  const stats = useMemo(() => {
    const today = getLocalDateString();
    const todayOrdersList = orders.filter((o) => o.startDate === today);
    return {
      active: orders.filter(
        (o) => o.status === "Đang thuê" || o.status === "Quá hạn",
      ).length,
      overdue: orders.filter((o) => o.status === "Quá hạn").length,
      revenue: orders.reduce(
        (acc, o) => acc + getOrderRentTotal(o) + o.penalty,
        0,
      ),
      todayRevenue: todayOrdersList.reduce(
        (acc, o) => acc + getOrderRentTotal(o) + o.penalty,
        0,
      ),
      todayOrders: todayOrdersList.length,
    };
  }, [orders, getOrderRentTotal]);
  const toggleRefund = (id: string) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    const newStatus: RefundStatus =
      order.refundStatus === "Chưa trả cọc" ? "Đã trả cọc" : "Chưa trả cọc";
    dispatch(updateRefundStatus({ id, refundStatus: newStatus }));
    showNotification(`Đã cập nhật: ${newStatus}`, "info");
  };
  const updateOrderStatus = (id: string, status: OrderStatus) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (
      status === "Đã trả - Hoàn thành" &&
      order.status !== "Đã trả - Hoàn thành"
    ) {
      getOrderSkus(order).forEach((sku) => {
        const item = inventory.find((i) => i.sku === sku);
        if (item) {
          dispatch(updateItemStatus({ id: item.id, status: "Đang giặt ủi" }));
        }
      });
      showNotification('Đã trả đồ - Chuyển sang "Đang giặt ủi"', "success");
    } else if (status === "Đang thuê" && order.status !== "Đang thuê") {
      getOrderSkus(order).forEach((sku) => {
        const item = inventory.find((i) => i.sku === sku);
        if (item) {
          dispatch(updateItemStatus({ id: item.id, status: "Khách đang giữ" }));
        }
      });
    }
    dispatch(updateOrderStatusState({ id, status }));
  };
  const deleteOrder = (id: string) => {
    if (confirm("Xác nhận xóa đơn hàng này?")) {
      const order = orders.find((o) => o.id === id);
      if (order && order.status !== "Đã trả - Hoàn thành") {
        getOrderSkus(order).forEach((sku) => {
          const item = inventory.find((i) => i.sku === sku);
          if (item) {
            dispatch(updateItemStatus({ id: item.id, status: "Sẵn sàng" }));
          }
        });
      }
      dispatch(removeOrder(id));
      showNotification("Đã xóa đơn hàng", "info");
    }
  };
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const search = searchTerm.toLowerCase();
      const skus = getOrderSkus(o);
      const matchesSearch =
        o.customerName.toLowerCase().includes(search) ||
        o.id.toLowerCase().includes(search) ||
        o.phone.includes(search) ||
        skus.some((sku) => sku.toLowerCase().includes(search));
      const matchesFilter =
        filterStatus === "Tất cả" || o.status === filterStatus;
      const matchesDate = (() => {
        if (dateFilterMode === "none") return true;
        if (dateFilterMode === "day" && selectedDay) {
          return o.startDate === selectedDay || o.dueDate === selectedDay;
        }
        if (dateFilterMode === "month" && selectedMonth) {
          const monthPrefix = `${selectedMonth}-`;
          return (
            o.startDate.startsWith(monthPrefix) ||
            o.dueDate.startsWith(monthPrefix)
          );
        }
        if (dateFilterMode === "year" && selectedYear) {
          const yearPrefix = `${selectedYear}-`;
          return (
            o.startDate.startsWith(yearPrefix) ||
            o.dueDate.startsWith(yearPrefix)
          );
        }
        return true;
      })();
      return matchesSearch && matchesFilter && matchesDate;
    });
  }, [
    orders,
    searchTerm,
    filterStatus,
    dateFilterMode,
    selectedDay,
    selectedMonth,
    selectedYear,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ROWS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE,
  );
  const rangeStart = filteredOrders.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + ROWS_PER_PAGE, filteredOrders.length);

  useEffect(() => {
    function init() {
      setCurrentPage(1);
    }
    init();
  }, [
    searchTerm,
    filterStatus,
    dateFilterMode,
    selectedDay,
    selectedMonth,
    selectedYear,
  ]);

  useEffect(() => {
    function updateTotalPages() {
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }
    updateTotalPages();
  }, [currentPage, totalPages]);

  const handleTableWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
      const scrollingUp = event.deltaY < 0;
      const scrollingDown = event.deltaY > 0;
      if ((scrollingUp && atTop) || (scrollingDown && atBottom)) {
        return;
      }
      event.stopPropagation();
    },
    [],
  );

  return (
    <div>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tighter mb-1 text-white">
              Nhật Ký Đơn Hàng
            </h2>
            <p className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">
              Cơ sở dữ liệu theCAO Studio
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onNewOrder}
              className="flex items-center gap-2 px-8 py-3.5 bg-white text-black hover:bg-white/90 active:scale-[0.98] rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest shadow-xl shadow-white/5">
              <span className="material-symbols-outlined text-[18px]">
                add_shopping_cart
              </span>
              LẬP ĐƠN MỚI
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Đang thuê",
              val: stats.active,
              icon: "shopping_bag",
              color: "text-sky-400",
            },
            {
              label: "Quá hạn",
              val: stats.overdue,
              icon: "running_with_errors",
              color: "text-rose-500",
            },
            {
              label: "Tổng doanh thu",
              val: `${(stats.revenue / 1000000).toFixed(1)}M`,
              icon: "payments",
              color: "text-emerald-400",
            },
            {
              label: "Doanh thu hôm nay",
              val: stats.todayRevenue.toLocaleString() + "đ",
              icon: "today",
              color: "text-yellow-400",
            },
          ].map((card, idx) => (
            <div
              key={idx}
              className="bg-white border border-white/5 p-5 rounded-2xl flex flex-col items-center gap-2 text-center min-w-[180px] shadow-md hover:shadow-lg">
              <span
                className={`material-symbols-outlined text-[22px] ${card.color}`}>
                {card.icon}
              </span>
              <div>
                <p className="text-lg font-extrabold tracking-tight leading-none text-black">
                  {card.val}
                </p>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest mt-1 ${card.color}`}>
                  {card.label}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 items-center bg-white/[0.04] border border-white/10 p-3 rounded-2xl shadow-sm">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo khách, SĐT, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/15 rounded-xl pl-11 pr-10 py-2.5 text-[12px] outline-none focus:border-white/30 transition-all font-bold text-white placeholder:text-white/40"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.06] border border-white/10 rounded-xl overflow-x-auto dark-scrollbar shrink-0">
            {[
              "Tất cả",
              "Chờ lấy đồ",
              "Đang thuê",
              "Quá hạn",
              "Đã trả - Hoàn thành",
            ].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st as OrderStatus | "Tất cả")}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  filterStatus === st
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}>
                {st}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setIsDateFilterOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                dateFilterMode !== "none"
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.06] text-white/70 border-white/10 hover:text-white"
              }`}>
              <span className="material-symbols-outlined text-[16px]">
                calendar_month
              </span>
              Lọc ngày
            </button>
            {isDateFilterOpen && (
              <div className="absolute right-0 mt-2 w-[260px] p-3 rounded-2xl bg-[#111827] border border-white/10 shadow-xl z-20">
                <div className="flex gap-1 mb-2">
                  {["day", "month", "year"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setDateFilterMode(mode as "day" | "month" | "year");
                      }}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        dateFilterMode === mode
                          ? "bg-white text-black"
                          : "bg-white/[0.06] text-white/70 hover:text-white"
                      }`}>
                      {mode === "day"
                        ? "Ngày"
                        : mode === "month"
                          ? "Tháng"
                          : "Năm"}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {dateFilterMode === "day" && (
                    <DatePicker
                      selected={
                        selectedDay ? parseLocalDateString(selectedDay) : null
                      }
                      onChange={(date: Date | null) => {
                        setSelectedDay(date ? formatLocalDateString(date) : "");
                      }}
                      locale="vi"
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Chọn ngày"
                      className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-[11px] font-bold text-white"
                      calendarClassName="bg-white text-black rounded-xl"
                    />
                  )}
                  {dateFilterMode === "month" && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-[11px] font-bold text-white"
                    />
                  )}
                  {dateFilterMode === "year" && (
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      placeholder="YYYY"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-[11px] font-bold text-white"
                    />
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      const today = getLocalDateString();
                      setDateFilterMode("day");
                      setSelectedDay(today);
                      setSelectedMonth("");
                      setSelectedYear("");
                      setIsDateFilterOpen(false);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white text-black">
                    Hôm nay
                  </button>
                  <button
                    onClick={() => {
                      setDateFilterMode("none");
                      setSelectedDay("");
                      setSelectedMonth("");
                      setSelectedYear("");
                      setIsDateFilterOpen(false);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white/[0.06] text-white/70 hover:text-white">
                    Hủy lọc
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="border border-white/15 rounded-3xl bg-[#f2f3f5]">
          <div
            className="relative overflow-x-auto overflow-y-auto scrollbar max-h-[600px] rounded-3xl overscroll-contain"
            onWheel={handleTableWheel}>
            <table className="w-full text-left border-collapse min-w-[1100px] text-[#1f2937]">
              <thead className="sticky top-0 z-10 bg-[#e6e7ea]">
                <tr className="bg-[#e6e7ea] text-stone-900 text-[9px] uppercase tracking-[0.2em] font-black border-b border-white/20">
                  <th className="px-6 py-5">Khách hàng</th>
                  <th className="px-6 py-5">Sản phẩm</th>
                  <th className="px-6 py-5">Lịch trình</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-6 py-5">Giá thuê</th>
                  <th className="px-6 py-5">Cọc & Hoàn</th>
                  <th className="px-6 py-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {paginatedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-black/5 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-[#111827]">
                          {order.customerName}
                        </span>
                        <span className="text-[10px] text-[#6b7280] font-bold">
                          {order.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {getOrderSkus(order).map((sku) => (
                          <span
                            key={sku}
                            className="inline-flex px-2 py-0.5 rounded bg-indigo-600/15 border border-indigo-600/40 text-[10px] font-black text-indigo-600 tracking-widest uppercase">
                            {sku}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-[11px] font-black text-[#4b5563]">
                        <span>{order.startDate}</span>
                        <span className="material-symbols-outlined text-[14px] opacity-30">
                          arrow_forward
                        </span>
                        <span
                          className={
                            order.status === "Quá hạn" ? "text-rose-500" : ""
                          }>
                          {order.dueDate}
                        </span>
                      </div>
                      {order.note && (
                        <div className="mt-1 text-[10px] font-bold text-black/45">
                          {order.note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value as OrderStatus,
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all ${STATUS_BADGES[order.status]}`}>
                        <option value="Chờ lấy đồ" className="bg-[#f2f3f5]">
                          Chờ lấy đồ
                        </option>
                        <option value="Đang thuê" className="bg-[#f2f3f5]">
                          Đang thuê
                        </option>
                        <option value="Quá hạn" className="bg-[#f2f3f5]">
                          Quá hạn
                        </option>
                        <option
                          value="Đã trả - Hoàn thành"
                          className="bg-[#f2f3f5]">
                          Đã trả - Hoàn thành
                        </option>
                      </select>
                    </td>
                    <td className="px-6 py-5 font-black text-[13px] text-[#111827]">
                      {(
                        getOrderRentTotal(order) + order.penalty
                      ).toLocaleString()}
                      đ
                      <div className="mt-1 text-[10px] font-normal text-black/50">
                        (cho thuê {getOrderDaysRented(order)} ngày)
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => toggleRefund(order.id)}
                        className={`px-3 py-1 rounded-lg border transition-all text-[10px] font-black ${
                          order.refundStatus === "Đã trả cọc"
                            ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-600"
                            : "bg-black/5 border-black/10 text-[#6b7280]"
                        }`}>
                        {order.depositReceived.toLocaleString()}đ •{" "}
                        {order.refundStatus === "Đã trả cọc" ? "X" : "..."}
                      </button>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditOrder(order)}
                          className="p-2 text-black/40 hover:text-black">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteOrder(order.id)}
                          className="p-2 text-rose-500/50 hover:text-rose-500">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-center justify-between text-[0.8rem] font-bold mt-3">
          <span>
            Hiển thị {rangeStart}-{rangeEnd} / {inventory.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className={`px-3 py-1.5 rounded-lg border border-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed ${safePage === 1 ? "text-white/40" : "text-white hover:bg-white/20"}`}>
              Trước
            </button>
            <span className="text-white/50">
              Trang {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={safePage === totalPages}
              className={`px-3 py-1.5 rounded-lg border border-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed ${safePage === totalPages ? "text-white/40" : "text-white hover:bg-white/20"}`}>
              Tiếp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
