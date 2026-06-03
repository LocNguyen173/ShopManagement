import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type InventoryItem, type ItemStatus } from "../types";
import { EditInventoryDrawer } from "./EditInventoryDrawer";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import {
  addItem as addInventoryItem,
  removeItem,
  updateItemStatus,
} from "../slices/inventorySlice";
import {
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
interface Props {
  onNewOrder: (sku: string) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
}
const COSTUME_TYPES = [
  "Váy cưới",
  "Váy dạ hội",
  "Áo dài",
  "Áo yếm",
  "Sườn xám",
  "Váy dài",
  "Váy ngắn",
  "Đầm body",
  "Chân váy",
  "Áo thun",
  "Sơ mi",
  "Đồ vest",
  "Quần tây",
  "Quần jean",
  "Áo khoác / Blazer",
  "Phụ kiện",
];
const SIZES = ["S", "M", "L", "XL", "XXL", "Freesize"];
const STATUS_COLORS: Record<ItemStatus, string> = {
  "Sẵn sàng": "bg-emerald-600/20 text-emerald-600 border-emerald-600/30",
  "Khách đang giữ": "bg-sky-600/20 text-sky-600 border-sky-600/30",
  "Đang giặt ủi": "bg-amber-600/20 text-amber-600 border-amber-600/30",
  "Đang sửa chữa": "bg-rose-600/20 text-rose-600 border-rose-600/30",
};
export const InventoryTab: React.FC<Props> = ({
  onNewOrder,
  showNotification,
}) => {
  const ROWS_PER_PAGE = 10;
  const dispatch = useAppDispatch();
  const items: InventoryItem[] = useAppSelector(
    (state) => state.inventory.items,
  );
  const [showAdd, setShowAdd] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<ItemStatus | "Tất cả">(
    "Tất cả",
  );
  const [filterType, setFilterType] = useState("Tất cả");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    sku: "",
    name: "",
    type: "Váy cưới",
    size: "M",
    price: 0,
    deposit: 0,
    status: "Sẵn sàng",
    note: "",
    imageUrl: "",
  });
  const handleNewImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewItem((current) => ({
        ...current,
        imageUrl: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };
  const addItem = () => {
    if (!newItem.sku || !newItem.name) {
      showNotification("Vui lòng nhập Mã SKU và Tên đồ", "error");
      return;
    }
    if (items.find((i) => i.sku === newItem.sku)) {
      showNotification("Mã sản phẩm này đã tồn tại trong kho", "error");
      return;
    }
    const item: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      sku: newItem.sku!,
      name: newItem.name!,
      type: newItem.type || "Váy cưới",
      size: newItem.size || "M",
      price: Math.max(0, Number(newItem.price)) || 0,
      deposit: Math.max(0, Number(newItem.deposit)) || 0,
      status: (newItem.status as ItemStatus) || "Sẵn sàng",
      note: newItem.note || "",
      imageUrl: newItem.imageUrl || "",
    };
    dispatch(addInventoryItem(item));
    setShowAdd(false);
    setNewItem({
      sku: "",
      name: "",
      type: "Váy cưới",
      size: "M",
      price: 0,
      deposit: 0,
      status: "Sẵn sàng",
      note: "",
      imageUrl: "",
    });
    showNotification("Đã thêm sản phẩm thành công", "success");
  };
  const updateStatus = (id: string, status: ItemStatus) => {
    dispatch(updateItemStatus({ id, status }));
    showNotification(`Đã cập nhật trạng thái: ${status}`, "info");
  };
  const deleteItem = (id: string) => {
    if (confirm("Xác nhận xóa sản phẩm này khỏi kho?")) {
      dispatch(removeItem(id));
      showNotification("Đã xóa sản phẩm", "info");
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setShowEditDrawer(true);
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

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    return items.filter((item) => {
      if (filterStatus !== "Tất cả" && item.status !== filterStatus) {
        return false;
      }
      if (filterType !== "Tất cả" && item.type !== filterType) {
        return false;
      }
      if (min !== null && item.price < min) {
        return false;
      }
      if (max !== null && item.price > max) {
        return false;
      }
      if (!search) {
        return true;
      }
      return (
        item.sku.toLowerCase().includes(search) ||
        item.name.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search) ||
        item.size.toLowerCase().includes(search) ||
        (item.note || "").toLowerCase().includes(search)
      );
    });
  }, [items, searchTerm, filterStatus, filterType, minPrice, maxPrice]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ROWS_PER_PAGE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ROWS_PER_PAGE;
  const paginatedItems = filteredItems.slice(
    startIndex,
    startIndex + ROWS_PER_PAGE,
  );
  const rangeStart = filteredItems.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + ROWS_PER_PAGE, filteredItems.length);

  useEffect(() => {
    function init() {
      setCurrentPage(1);
    }
    init();
  }, [searchTerm, filterStatus, filterType, minPrice, maxPrice]);

  useEffect(() => {
    function updateTotalPages() {
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }
    updateTotalPages();
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2 text-white">
            Kho Hàng
          </h2>
          <p className="text-white text-[13px] font-bold uppercase tracking-[0.2em]">
            Quản lý trang phục
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2.5 px-7 py-4 bg-white text-black rounded-2xl font-black text-[13px] hover:bg-gray-100 active:scale-95 transition-all shadow-xl shadow-white/5 uppercase tracking-wider">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Thêm trang phục
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-white/[0.04] border border-white/10 p-3 rounded-2xl shadow-sm">
        <div className="flex-1 min-w-[220px] relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo SKU, tên, loại, size..."
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
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="min-w-[160px] bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none">
          <option value="Tất cả" className="bg-[#0c0c0c]">
            Tất cả loại
          </option>
          {COSTUME_TYPES.map((type) => (
            <option key={type} value={type} className="bg-[#0c0c0c]">
              {type}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as ItemStatus | "Tất cả")
          }
          className="min-w-[150px] bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none">
          <option value="Tất cả" className="bg-[#0c0c0c]">
            Tất cả trạng thái
          </option>
          <option value="Sẵn sàng" className="bg-[#0c0c0c]">
            Sẵn sàng
          </option>
          <option value="Khách đang giữ" className="bg-[#0c0c0c]">
            Khách đang giữ
          </option>
          <option value="Đang giặt ủi" className="bg-[#0c0c0c]">
            Đang giặt ủi
          </option>
          <option value="Đang sửa chữa" className="bg-[#0c0c0c]">
            Đang sửa chữa
          </option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Giá từ"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-[110px] bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none"
          />
          <span className="text-white/40 text-[10px] font-black">-</span>
          <input
            type="number"
            min="0"
            placeholder="Giá đến"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-[110px] bg-white/[0.06] border border-white/15 rounded-xl px-3 py-2.5 text-[11px] font-bold text-white outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchTerm("");
            setFilterType("Tất cả");
            setFilterStatus("Tất cả");
            setMinPrice("");
            setMaxPrice("");
          }}
          className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/[0.06] text-white/70 border border-white/10 hover:text-white transition-all">
          Hủy lọc
        </button>
      </div>

      <div className="border border-gray-200/60 rounded-[28px] bg-gray-100/80 shadow-[0_16px_50px_rgba(0,0,0,0.06)] overflow-hidden">
        <div
          className="relative overflow-x-auto overflow-y-auto max-h-[500px] scrollbar rounded-[28px] overscroll-contain"
          onWheel={handleTableWheel}>
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-white-800">
              <tr className="bg-gray-200 text-gray-600 text-[9px] uppercase tracking-[0.1em] font-black border-b border-gray-200/60">
                <th className="px-4 py-5">Mã SKU</th>
                <th className="px-4 py-5">Tên trang phục</th>
                <th className="px-4 py-5">Loại</th>
                <th className="px-4 py-5">Giá & Cọc</th>
                <th className="px-4 py-5">Trạng thái</th>
                <th className="px-4 py-5 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-200/50 transition-colors group">
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      {item.imageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              src: item.imageUrl!,
                              alt: item.name,
                            })
                          }
                          className="h-8 w-8 rounded-lg border border-gray-200/70 overflow-hidden flex-shrink-0"
                          aria-label={`Xem ảnh ${item.name}`}>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gray-200/70 border border-gray-200/70 flex items-center justify-center text-[9px] font-black text-gray-400 flex-shrink-0">
                          N/A
                        </div>
                      )}
                      <span className="px-2.5 py-1.5 rounded-lg bg-gray-200/70 border border-gray-200/70 text-[11px] font-bold text-gray-800 tracking-wide uppercase whitespace-nowrap">
                        {item.sku}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5 max-w-xs">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-black text-gray-900 line-clamp-2">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold italic mt-0.5 line-clamp-1">
                        {item.note || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-bold text-gray-700">
                        {item.type}
                      </span>
                      <span className="inline-flex w-fit px-2 py-0.5 rounded-md bg-gray-200/70 border border-gray-200/70 text-[9px] text-gray-600 font-bold uppercase">
                        {item.size}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-gray-900 whitespace-nowrap">
                        {item.price.toLocaleString()}đ
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold tracking-tight whitespace-nowrap">
                        Cọc: {item.deposit.toLocaleString()}đ
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateStatus(item.id, e.target.value as ItemStatus)
                      }
                      className={`text-[9px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-all ${STATUS_COLORS[item.status]}`}>
                      <option
                        value="Sẵn sàng"
                        className="bg-gray-100 text-gray-800">
                        Sẵn sàng
                      </option>
                      <option
                        value="Khách đang giữ"
                        className="bg-gray-100 text-gray-800">
                        Khách đang giữ
                      </option>
                      <option
                        value="Đang giặt ủi"
                        className="bg-gray-100 text-gray-800">
                        Đang giặt ủi
                      </option>
                      <option
                        value="Đang sửa chữa"
                        className="bg-gray-100 text-gray-800">
                        Đang sửa chữa
                      </option>
                    </select>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === "Sẵn sàng" && (
                        <button
                          onClick={() => onNewOrder(item.sku)}
                          title="Tạo đơn hàng"
                          className="p-1.5 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all active:scale-95 shadow-md shadow-sky-500/20">
                          <PlusCircleIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditItem(item)}
                        title="Chỉnh sửa"
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-600 border border-indigo-100 rounded-lg transition-all">
                        <PencilSquareIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        title="Xóa"
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 border border-rose-100 rounded-lg transition-all">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-gray-200 text-[48px]">
                        inventory_2
                      </span>
                      <p className="text-gray-400 font-black uppercase tracking-[0.1em] text-[11px]">
                        {searchTerm
                          ? "Không tìm thấy sản phẩm phù hợp"
                          : "Chưa có sản phẩm nào trong kho"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between text-[0.8rem] font-bold mt-3">
        <span>
          Hiển thị {rangeStart}-{rangeEnd} / {filteredItems.length}
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
      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative bg-[#0c0c0c] border border-white/10 rounded-[32px] w-full max-w-xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-fade">
            <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="font-black text-2xl text-white tracking-tighter">
                  Thêm Trang Phục
                </h3>
                <p className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em] mt-1">
                  Ghi nhận sản phẩm mới vào hệ thống
                </p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="material-symbols-outlined text-white/20 hover:text-white transition-colors bg-white/5 p-3 rounded-2xl">
                close
              </button>
            </div>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto dark-scrollbar">
              <div className="space-y-2.5">
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                  Mã sản phẩm (SKU)
                </label>
                <input
                  value={newItem.sku}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      sku: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none focus:border-white/30 transition-all font-black tracking-widest text-sky-400"
                  placeholder="VD: VC1-01"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                  Tên trang phục
                </label>
                <input
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none focus:border-white/30 transition-all font-bold"
                  placeholder="VD: Váy cưới tơ hoa"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                    Phân loại
                  </label>
                  <select
                    value={newItem.type}
                    onChange={(e) =>
                      setNewItem({ ...newItem, type: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none font-bold cursor-pointer">
                    {COSTUME_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-[#1a1a1a]">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                    Kích cỡ (Size)
                  </label>
                  <select
                    value={newItem.size}
                    onChange={(e) =>
                      setNewItem({ ...newItem, size: e.target.value })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none font-bold cursor-pointer">
                    {SIZES.map((size) => (
                      <option key={size} value={size} className="bg-[#1a1a1a]">
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                    Giá thuê/ngày (đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none focus:border-white/30 font-black"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                    Tiền đặt cọc (đ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.deposit}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        deposit: Number(e.target.value),
                      })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none focus:border-white/30 font-black"
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                  Ảnh trang phục
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleNewImage(e.target.files?.[0])}
                    className="w-full text-[12px] text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-[11px] file:font-black file:uppercase file:tracking-widest file:text-white/70 hover:file:bg-white/20"
                  />
                  {newItem.imageUrl ? (
                    <img
                      src={newItem.imageUrl}
                      alt={newItem.name || "preview"}
                      className="h-16 w-16 rounded-2xl object-cover border border-white/10"
                    />
                  ) : null}
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] text-white/30 uppercase font-black tracking-widest ml-1">
                  Ghi chú thêm
                </label>
                <textarea
                  value={newItem.note}
                  onChange={(e) =>
                    setNewItem({ ...newItem, note: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[14px] outline-none focus:border-white/30 transition-all font-bold min-h-[100px] resize-none"
                  placeholder="Thông tin về tình trạng đồ, sửa chữa..."
                />
              </div>
            </div>
            <div className="p-10 bg-white/[0.01] flex gap-4 border-t border-white/5">
              <button
                onClick={() => {
                  setNewItem({});
                  setShowAdd(false);
                }}
                className="flex-1 py-5 text-[11px] font-black border border-white/10 rounded-2xl hover:bg-white/5 transition-all text-white/30 uppercase tracking-widest">
                Hủy bỏ
              </button>
              <button
                onClick={addItem}
                className="flex-1 py-5 text-[11px] font-black bg-white text-black rounded-2xl hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest shadow-xl shadow-white/10">
                Lưu sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          />
          <div className="relative max-w-4xl w-full">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 material-symbols-outlined text-white/60 hover:text-white transition-colors bg-white/10 p-2 rounded-xl"
              aria-label="Đóng ảnh">
              close
            </button>
            <div className="bg-black/80 border border-white/10 rounded-[24px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
              <img
                src={previewImage.src}
                alt={previewImage.alt}
                className="w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
      <EditInventoryDrawer
        isOpen={showEditDrawer}
        onClose={() => {
          setShowEditDrawer(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onChange={setEditingItem}
        showNotification={showNotification}
      />
    </div>
  );
};
