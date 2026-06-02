import React, { useMemo, useCallback, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAppSelector } from "../hooks/reduxHooks";
import { type InventoryItem, type Order, getOrderSkus } from "../types";

const toLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
};

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const toNumberValue = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const numeric = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const Stats: React.FC = () => {
  const orders: Order[] = useAppSelector((state) => state.orders.orders);
  const inventory: InventoryItem[] = useAppSelector(
    (state) => state.inventory.items,
  );
  const today = toLocalDateString(new Date());
  const currentMonth = today.slice(0, 7);
  const currentYear = String(new Date().getFullYear());
  const [filterMode, setFilterMode] = useState<"day" | "month" | "year">(
    "month",
  );
  const [selectedDay, setSelectedDay] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

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

  const years = useMemo(() => {
    const set = new Set<string>([currentYear]);
    orders.forEach((order) => {
      if (order.startDate) {
        set.add(order.startDate.slice(0, 4));
      }
    });
    return Array.from(set).sort();
  }, [orders, currentYear]);

  const filteredOrders = useMemo(() => {
    if (filterMode === "day") {
      return orders.filter((order) => order.startDate === selectedDay);
    }
    if (filterMode === "month") {
      return orders.filter((order) =>
        order.startDate.startsWith(selectedMonth),
      );
    }
    return orders.filter((order) => order.startDate.startsWith(selectedYear));
  }, [orders, filterMode, selectedDay, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    const revenueByDate = new Map<string, number>();
    const revenueByMonth = new Map<string, number>();
    const skuRevenue = new Map<string, number>();

    filteredOrders.forEach((order) => {
      const amount = getOrderRentTotal(order) + order.penalty;
      totalRevenue += amount;

      revenueByDate.set(
        order.startDate,
        (revenueByDate.get(order.startDate) || 0) + amount,
      );

      const monthKey = order.startDate.slice(0, 7);
      revenueByMonth.set(
        monthKey,
        (revenueByMonth.get(monthKey) || 0) + amount,
      );

      const skus = getOrderSkus(order);
      if (skus.length > 0) {
        const split = amount / skus.length;
        skus.forEach((sku) => {
          skuRevenue.set(sku, (skuRevenue.get(sku) || 0) + split);
        });
      }
    });

    const chartData: Array<{
      label: string;
      fullDate: string;
      revenue: number;
    }> = (() => {
      if (filterMode === "day") {
        return [
          {
            label: selectedDay.slice(5),
            fullDate: selectedDay,
            revenue: totalRevenue,
          },
        ];
      }
      if (filterMode === "month") {
        const [year, month] = selectedMonth.split("-");
        const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
        return Array.from({ length: daysInMonth }, (_, idx) => {
          const day = String(idx + 1).padStart(2, "0");
          const key = `${selectedMonth}-${day}`;
          return {
            label: day,
            fullDate: key,
            revenue: revenueByDate.get(key) || 0,
          };
        });
      }
      return Array.from({ length: 12 }, (_, idx) => {
        const month = String(idx + 1).padStart(2, "0");
        const key = `${selectedYear}-${month}`;
        return {
          label: `T${idx + 1}`,
          fullDate: key,
          revenue: revenueByMonth.get(key) || 0,
        };
      });
    })();

    const topItems = Array.from(skuRevenue.entries())
      .map(([sku, value]) => {
        const item = inventory.find((current) => current.sku === sku);
        return {
          sku,
          name: item ? item.name : sku,
          revenue: Math.round(value),
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      totalRevenue,
      averageOrderValue: filteredOrders.length
        ? Math.round(totalRevenue / filteredOrders.length)
        : 0,
      orderCount: filteredOrders.length,
      chartData,
      topItems,
    };
  }, [
    filteredOrders,
    filterMode,
    selectedDay,
    selectedMonth,
    selectedYear,
    getOrderRentTotal,
    inventory,
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tighter">
          Bảng Điều Khiển Doanh Thu
        </h2>
        <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.35em]">
          Tổng quan kinh doanh theCAO Studio
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-1">
          {[
            { id: "day", label: "Theo ngày" },
            { id: "month", label: "Theo tháng" },
            { id: "year", label: "Theo năm" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterMode(item.id as "day" | "month" | "year")}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
                filterMode === item.id
                  ? "bg-white text-black"
                  : "text-white/50 hover:text-white"
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {filterMode === "day" && (
            <input
              type="date"
              value={selectedDay}
              onChange={(event) => setSelectedDay(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
            />
          )}
          {filterMode === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
            />
          )}
          {filterMode === "year" && (
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white">
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Doanh thu theo kỳ",
            value: formatCurrency(stats.totalRevenue),
            tone: "text-emerald-400",
            icon: "payments",
          },
          {
            label: "Số đơn",
            value: `${stats.orderCount} đơn`,
            tone: "text-sky-400",
            icon: "assignment",
          },
          {
            label: "TB/đơn",
            value: formatCurrency(stats.averageOrderValue),
            tone: "text-rose-400",
            icon: "analytics",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white/[0.04] border border-white/10 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span
                className={`material-symbols-outlined text-[22px] ${card.tone}`}>
                {card.icon}
              </span>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black">
                {card.label}
              </span>
            </div>
            <div className="text-2xl font-black tracking-tight">
              {card.value}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white/[0.04] border border-white/10 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black">
                DOANH THU THEO KỲ
              </p>
              <h3 className="text-xl font-bold">Xu hướng doanh thu</h3>
            </div>
            <span className="text-[10px] text-white/50 font-bold">
              {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(12,12,12,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 11,
                  }}
                  formatter={(value) => formatCurrency(toNumberValue(value))}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullDate || label
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/10 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-black">
                TOP MẶT HÀNG
              </p>
              <h3 className="text-xl font-bold">Đóng góp doanh thu</h3>
            </div>
            <span className="text-[10px] text-white/50 font-bold">
              {stats.topItems.length} mục
            </span>
          </div>
          <div className="space-y-3">
            {stats.topItems.length === 0 ? (
              <div className="text-white/40 text-sm italic">
                Chưa có dữ liệu doanh thu.
              </div>
            ) : (
              stats.topItems.map((item, idx) => (
                <div
                  key={item.sku}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white/70">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                      {item.sku}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
