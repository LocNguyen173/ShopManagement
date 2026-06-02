import React, {
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { NewOrderDrawer } from "./components/NewOrderDrawer";
import { type InventoryItem, type Order, getOrderSkus } from "./types";
import { useAppDispatch, useAppSelector } from "./hooks/reduxHooks";
import { setItems } from "./slices/inventorySlice";
import { setOrders } from "./slices/ordersSlice";
import {
  setActiveTab,
  openDrawer,
  closeDrawer,
  setNotification,
  setLastBackupAt,
  setIsDataLoaded,
} from "./slices/uiSlice";
import { motion, AnimatePresence } from "motion/react";

const InventoryTab = React.lazy(() =>
  import("./components/InventoryTab").then((module) => ({
    default: module.InventoryTab,
  })),
);
const OrdersTab = React.lazy(() =>
  import("./components/OrdersTab").then((module) => ({
    default: module.OrdersTab,
  })),
);
const CalendarTab = React.lazy(() =>
  import("./components/CalendarTab").then((module) => ({
    default: module.CalendarTab,
  })),
);
const Stats = React.lazy(() =>
  import("./components/Stats").then((module) => ({
    default: module.Stats,
  })),
);
export default function App() {
  type TabId = "inventory" | "orders" | "calendar" | "stats";
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const isDrawerOpen = useAppSelector((state) => state.ui.isDrawerOpen);
  const prefilledSku = useAppSelector((state) => state.ui.prefilledSku);
  const editingOrder = useAppSelector((state) => state.ui.editingOrder);
  const notification = useAppSelector((state) => state.ui.notification);
  const lastBackupAt = useAppSelector((state) => state.ui.lastBackupAt);
  const isDataLoaded = useAppSelector((state) => state.ui.isDataLoaded);
  const inventory = useAppSelector((state) => state.inventory.items);
  const orders = useAppSelector((state) => state.orders.orders);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Khởi tạo trạng thái mặc định (loại bỏ LocalStorage vì sandbox chặn truy cập origin)
  const storage = useMemo(
    () => ({
      getData: async () => {
        if (window.shopStorage) {
          return window.shopStorage.getData();
        }
        const raw = window.localStorage.getItem("shopManagement:data");
        return raw
          ? (JSON.parse(raw) as { inventory: InventoryItem[]; orders: Order[] })
          : null;
      },
      saveData: async (data: {
        inventory: InventoryItem[];
        orders: Order[];
      }) => {
        if (window.shopStorage) {
          await window.shopStorage.saveData(data);
          return;
        }
        window.localStorage.setItem(
          "shopManagement:data",
          JSON.stringify(data),
        );
      },
    }),
    [],
  );
  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      dispatch(setNotification({ message, type }));
      setTimeout(() => dispatch(setNotification(null)), 3000);
    },
    [dispatch],
  );
  // Inject Global CSS
  useEffect(() => {
    const id = "flow-design-system-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .dark-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
      .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .dark-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
      .dark-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background: #080808; overflow: hidden; font-family: 'Google Sans Text', sans-serif; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; }
      select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.4)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.1em 1.1em; padding-right: 2.2rem; -webkit-appearance: none; appearance: none; }
      input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); cursor: pointer; }
      .animate-fade { animation: fade 0.3s ease-out; }
      @keyframes fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }, []);
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await storage.getData();
        if (data) {
          dispatch(setItems(data.inventory || []));
          dispatch(setOrders(data.orders || []));
        }
      } catch (error) {
        console.error("Load data error:", error);
        showNotification("Không thể tải dữ liệu cục bộ", "error");
      } finally {
        dispatch(setIsDataLoaded(true));
      }
    };
    loadData();
  }, [dispatch, showNotification, storage]);
  useEffect(() => {
    if (!isDataLoaded) return;
    const saveTimeout = window.setTimeout(() => {
      storage.saveData({ inventory, orders }).catch((error) => {
        console.error("Save data error:", error);
      });
    }, 300);
    return () => window.clearTimeout(saveTimeout);
  }, [inventory, orders, isDataLoaded, storage]);
  const handleNewOrder = (sku?: string) => {
    dispatch(openDrawer({ prefilledSku: sku }));
  };
  const handleEditOrder = (order: Order) => {
    dispatch(openDrawer({ editingOrder: order }));
  };
  /** SAO LƯU DỮ LIỆU SANG JSON */
  const handleFullBackup = async () => {
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        inventory,
        orders,
      };
      const jsonContent = JSON.stringify(payload, null, 2);
      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = now.toISOString().split("T")[0];
      const fileName = `theCAO_Backup_${dateStr}_${timeStr.replace(":", "h")}.json`;
      const blob = new Blob([jsonContent], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const ts = `${dateStr} ${timeStr}`;
      dispatch(setLastBackupAt(ts));
      showNotification("Đã lưu file sao lưu JSON vào máy!", "success");
    } catch (error) {
      showNotification("Lỗi khi sao lưu dữ liệu", "error");
      console.error("Backup error:", error);
    }
  };
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text) as {
          inventory?: InventoryItem[];
          orders?: Order[];
        };
        const newInventory = Array.isArray(data.inventory)
          ? data.inventory
          : [];
        const newOrders = Array.isArray(data.orders) ? data.orders : [];
        if (newInventory.length === 0 && newOrders.length === 0) {
          showNotification("Không tìm thấy dữ liệu hợp lệ trong JSON", "error");
          return;
        }
        if (
          window.confirm(
            `XÁC NHẬN KHÔI PHỤC:\n- ${newInventory.length} trang phục\n- ${newOrders.length} đơn hàng\n\nDữ liệu hiện tại sẽ bị ghi đè.`,
          )
        ) {
          dispatch(setItems(newInventory));
          dispatch(setOrders(newOrders));
          showNotification("Khôi phục dữ liệu từ JSON thành công!", "success");
        }
      } catch (err) {
        showNotification("Lỗi đọc file JSON", "error");
        console.error("Import error:", err);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };
  const handleExportReport = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const getOrderDaysRented = (order: Order) => {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const start = new Date(order.startDate);
        const due = new Date(order.dueDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(due.getTime())) {
          return 0;
        }
        const diff =
          Math.ceil((due.getTime() - start.getTime()) / MS_PER_DAY) + 1;
        return Math.max(0, diff);
      };
      const getOrderRentTotal = (order: Order) => {
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
            const discounted = Math.round(
              line.rentPrice * (1 - discount / 100),
            );
            return sum + discounted + daySurcharge;
          }, 0);
        }
        return order.rentPrice + daySurcharge;
      };
      const BOM = "\uFEFF";
      const reportOrders = orders.filter(
        (o: Order) => o.startDate === today || o.dueDate === today,
      );
      const todayRevenue = orders
        .filter((o: Order) => o.startDate === today)
        .reduce(
          (sum: number, o: Order) => sum + getOrderRentTotal(o) + o.penalty,
          0,
        );
      const reportHeader = `BÁO CÁO NGÀY ${today}\n\n`;
      const tableHeader =
        "ID ĐƠN,KHÁCH HÀNG,SĐT,SKU ĐỒ,GIÁ THUÊ,PHÍ PHẠT,TIỀN CỌC,TRẠNG THÁI\n";
      const rows = reportOrders
        .map(
          (o: Order) =>
            `${o.id},"${o.customerName}",${o.phone},"${getOrderSkus(o).join(" | ")}",${getOrderRentTotal(o)},${o.penalty},${o.depositReceived},"${o.status}"`,
        )
        .join("\n");
      const summary = `\n\nTổng đơn hôm nay: ${reportOrders.length}\nDoanh thu dự tính: ${todayRevenue.toLocaleString()} VNĐ`;
      const csvContent = BOM + reportHeader + tableHeader + rows + summary;
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(csvContent);
      const blob = new Blob([uint8Array], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `theCAO_BaoCao_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification("Đã xuất báo cáo!", "success");
    } catch (error) {
      console.error("Export error:", error);
      showNotification("Lỗi xuất báo cáo", "error");
    }
  };
  const menuItems: { id: TabId; label: string; icon: string }[] = [
    { id: "inventory", label: "Kho Hàng", icon: "inventory_2" },
    { id: "orders", label: "Đơn Hàng", icon: "assignment" },
    { id: "calendar", label: "Lịch Đặt", icon: "calendar_month" },
    { id: "stats", label: "Thống Kê", icon: "bar_chart" },
  ];
  return (
    <div className="flex h-screen w-screen text-white overflow-hidden font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJSON}
        accept=".json"
        className="hidden"
      />
      {/* Sidebar Navigation */}
      <div className="w-[280px] h-full border-r border-white/[0.03] flex flex-col bg-gray-800 shrink-0">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-3 px-2 justify-center">
            <h1 className="text-xl font-black tracking-tighter italic leading-none text-white">
              theCAO
            </h1>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            <p className="px-4 text-[8px] font-black text-white uppercase tracking-[0.3em] mb-4 text-lg">
              Danh mục
            </p>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => dispatch(setActiveTab(item.id))}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all relative ${
                  activeTab === item.id
                    ? "bg-white/5 text-white border border-white/5"
                    : "text-white/25 hover:text-white/60 hover:bg-white/[0.02]"
                }`}>
                <span
                  className={`material-symbols-outlined text-[20px] ${activeTab === item.id ? "text-white" : "text-white/5"}`}>
                  {item.icon}
                </span>
                <span className="text-[12px] font-bold tracking-tight">
                  {item.label}
                </span>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute right-3 w-1 h-4 rounded-full bg-white"
                  />
                )}
              </button>
            ))}
          </nav>
          {/* Local Data Actions & Persistence Status */}
          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-sky-400 text-[18px]">
                cloud_sync
              </span>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Dữ liệu hiện tại
                </span>
                {lastBackupAt ? (
                  <span className="text-[7px] text-sky-400 font-bold">
                    Lần cuối: {lastBackupAt}
                  </span>
                ) : (
                  <span className="text-[7px] text-white/20 font-bold italic">
                    Chưa sao lưu JSON
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFullBackup}
                  className="flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
                    download
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    Sao lưu file
                  </span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all group">
                  <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">
                    upload
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    Khôi phục
                  </span>
                </button>
              </div>
              <button
                onClick={handleExportReport}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">
                <span className="material-symbols-outlined text-[18px]">
                  analytics
                </span>
                Báo cáo ngày
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 h-full overflow-y-auto dark-scrollbar p-8 lg:p-12 bg-gray-600">
        <div className="max-w-7xl mx-auto h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                    Đang tải...
                  </div>
                }>
                {activeTab === "inventory" && (
                  <InventoryTab
                    onNewOrder={handleNewOrder}
                    showNotification={showNotification}
                  />
                )}
                {activeTab === "orders" && (
                  <OrdersTab
                    onNewOrder={() => handleNewOrder()}
                    onEditOrder={handleEditOrder}
                    showNotification={showNotification}
                  />
                )}
                {activeTab === "calendar" && (
                  <CalendarTab onNewOrder={() => handleNewOrder()} />
                )}
                {activeTab === "stats" && <Stats />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: 30, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 20, opacity: 0, x: "-50%" }}
            className={`fixed bottom-8 left-1/2 z-[150] px-6 py-3.5 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-2xl ${notification.type === "success" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-600" : notification.type === "error" ? "bg-rose-500/20 border-rose-500/30 text-rose-600" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"}`}>
            <span className="material-symbols-outlined text-[20px]">
              {notification.type === "success"
                ? "check_circle"
                : notification.type === "error"
                  ? "error"
                  : "info"}
            </span>
            <span className="text-[12px] font-bold tracking-tight">
              {notification.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <NewOrderDrawer
        isOpen={isDrawerOpen}
        onClose={() => dispatch(closeDrawer())}
        prefilledSku={prefilledSku}
        editingOrder={editingOrder || undefined}
        showNotification={showNotification}
      />
    </div>
  );
}
