import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type InventoryItem, type Order, getOrderSkus } from "../types";
import { useAppSelector } from "../hooks/reduxHooks";
interface Props {
  onNewOrder: () => void;
}
export const CalendarTab: React.FC<Props> = ({ onNewOrder }) => {
  const ROWS_PER_PAGE = 10;
  const inventory: InventoryItem[] = useAppSelector(
    (state) => state.inventory.items,
  );
  const orders: Order[] = useAppSelector((state) => state.orders.orders);
  const [viewDate, setViewDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const daysInMonth = useMemo(
    () =>
      new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate(),
    [viewDate],
  );
  const monthLabel = useMemo(
    () => viewDate.toLocaleString("vi-VN", { month: "long", year: "numeric" }),
    [viewDate],
  );
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth],
  );
  // Memoize booking status to prevent heavy calculations on each render
  const bookingMap = useMemo(() => {
    const map: Record<
      string,
      Record<number, { name: string; type: string } | null>
    > = {};
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, "0");
    inventory.forEach((item) => {
      map[item.sku] = {};
      days.forEach((day) => {
        const dayStr = String(day).padStart(2, "0");
        const dateStr = `${year}-${month}-${dayStr}`;
        const booking = orders.find(
          (o) =>
            getOrderSkus(o).includes(item.sku) &&
            dateStr >= o.startDate &&
            dateStr <= o.dueDate &&
            o.status !== "Đã trả - Hoàn thành",
        );
        map[item.sku][day] = booking
          ? { name: booking.customerName, type: booking.bookingType }
          : null;
      });
    });
    return map;
  }, [inventory, orders, viewDate, days]);
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };
  const handleToday = () => {
    setViewDate(new Date());
  };
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      viewDate.getMonth() === today.getMonth() &&
      viewDate.getFullYear() === today.getFullYear()
    );
  };
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const scrollStartRef = useRef(0);
  const handleDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const el = scrollRef.current;
      if (!el) return;
      isDraggingRef.current = true;
      dragStartYRef.current = event.clientY;
      scrollStartRef.current = el.scrollTop;
      el.classList.add("cursor-grabbing");
    },
    [],
  );
  const handleDragMove = useCallback((event: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const deltaY = event.clientY - dragStartYRef.current;
    el.scrollTop = scrollStartRef.current - deltaY;
  }, []);
  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    scrollRef.current?.classList.remove("cursor-grabbing");
  }, []);

  const totalPages = Math.max(1, Math.ceil(inventory.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const paginatedInventory = inventory.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE,
  );
  const rangeStart = inventory.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + ROWS_PER_PAGE, inventory.length);

  useEffect(() => {
    const init = () => {
      setCurrentPage(1);
    };
    init();
  }, [inventory.length, viewDate]);

  useEffect(() => {
    function updateTotalPages() {
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }
    updateTotalPages();
  }, [currentPage, totalPages]);
  return (
    <div className="animate-fade flex flex-col h-full max-h-[calc(100vh-160px)]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-1 text-white">
            Lịch Đặt Trang Phục
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">
                chevron_left
              </span>
            </button>
            <p className="text-white font-black uppercase tracking-[0.2em] text-[12px] min-w-[120px] text-center">
              {monthLabel}
            </p>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">
                chevron_right
              </span>
            </button>
            <button
              onClick={handleToday}
              className="ml-2 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest border border-white transition-all">
              Hôm nay
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onNewOrder}
            className="flex items-center gap-2 px-5 py-3.5 bg-white text-black rounded-2xl font-black text-[11px] hover:bg-gray-100 transition-all active:scale-95 shadow-xl shadow-white/5 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[18px]">
              calendar_add_on
            </span>
            ĐẶT LỊCH MỚI
          </button>
        </div>
      </div>
      <div className="flex gap-6 mb-4 text-[9px] font-black uppercase tracking-[0.2em] px-1">
        <div className="flex items-center gap-2 text-purple-300">
          <div className="w-2 h-2 bg-purple-400 rounded-sm shadow-[0_0_8px_rgba(196,181,253,0.35)]" />
          <span>Đã đặt</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <div className="w-2 h-2 bg-white/10 border border-white/15 rounded-sm" />
          <span>Còn trống</span>
        </div>
      </div>
      <div className="flex-1 border border-white/10 rounded-[24px] bg-[#191919] shadow-2xl flex flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] overflow-x-hidden dark-scrollbar overscroll-contain rounded-[24px] cursor-grab"
          onWheel={handleTableWheel}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}>
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-20 bg-[#202020]">
              <tr className="border-b border-white/10">
                <th className="sticky left-0 z-30 bg-[#202020] px-4 py-4 text-left border-r border-white/10 w-[160px] text-[9px] text-white/50 font-black uppercase tracking-[0.2em]">
                  Trang phục
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={`px-0 py-4 text-center border-r border-white/10 text-[9px] font-black transition-colors relative ${isToday(d) ? "bg-white/90 text-black" : "text-white/35"}`}>
                    {d}
                    {isToday(d) && (
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-sky-400" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedInventory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/[0.01] transition-colors group">
                  <td className="sticky left-0 z-10 bg-[#191919] px-4 py-2 border-r border-b border-white/10 group-hover:bg-[#1f1f1f] transition-colors truncate">
                    <div className="font-black text-[11px] text-white/90 tracking-tighter truncate">
                      {item.sku}
                    </div>
                    <div className="text-[8px] text-white/40 truncate font-black uppercase tracking-wider">
                      {item.name}
                    </div>
                  </td>
                  {days.map((d) => {
                    const booking = bookingMap[item.sku]?.[d];
                    return (
                      <td
                        key={d}
                        className={`border-r border-b border-white/10 relative p-0.5 h-10 transition-all ${booking ? "bg-white/[0.03]" : ""} ${isToday(d) ? "bg-white/[0.06]" : ""}`}
                        title={
                          booking
                            ? `${booking.name} (${booking.type})`
                            : "Sẵn sàng"
                        }>
                        {booking && (
                          <div
                            className={`w-full h-full rounded-md flex items-center justify-center transition-all ${
                              booking.type === "Tự động"
                                ? "bg-purple-400/45 shadow-[inset_0_1px_6px_rgba(196,181,253,0.25)]"
                                : "bg-white/10 opacity-40"
                            }`}>
                            <div
                              className={`w-1 h-1 rounded-full ${booking.type === "Tự động" ? "bg-purple-200" : "bg-white/50"}`}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="py-24 text-center">
                    <span className="material-symbols-outlined text-white/5 text-[48px] mb-2 block">
                      calendar_today
                    </span>
                    <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[8px]">
                      Chưa có dữ liệu
                    </p>
                  </td>
                </tr>
              )}
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
  );
};
