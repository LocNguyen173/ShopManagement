import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type InventoryItem, type ItemStatus } from "../types";
import { useAppDispatch } from "../hooks/reduxHooks";
import { updateItem } from "../slices/inventorySlice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onChange: (item: InventoryItem) => void;
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
  "Đầm",
  "Phụ kiện",
];

const SIZES = ["S", "M", "L", "XL", "XXL", "Freesize"];

const STATUS_OPTIONS: ItemStatus[] = [
  "Sẵn sàng",
  "Khách đang giữ",
  "Đang giặt ủi",
  "Đang sửa chữa",
];

export const EditInventoryDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  onChange,
  showNotification,
}) => {
  const dispatch = useAppDispatch();
  const handleImageChange = (file?: File) => {
    if (!file || !item) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...item, imageUrl: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  };
  const handleClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    if (!item) return;

    if (!item.sku || !item.name) {
      showNotification("Vui lòng điền đầy đủ thông tin bắt buộc", "error");
      return;
    }

    dispatch(updateItem(item));
    handleClose();
  };

  if (!item) return null;

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
                  Chỉnh Sửa Trang Phục
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
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Thông tin cơ bản
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Mã SKU"
                    value={item.sku}
                    onChange={(v) =>
                      onChange({ ...item, sku: v.toUpperCase() })
                    }
                    placeholder="VD: VC1-01"
                    disabled
                  />
                  <InputField
                    label="Tên trang phục"
                    value={item.name}
                    onChange={(v) => onChange({ ...item, name: v })}
                    placeholder="VD: Váy cưới tơ hoa"
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Phân loại & Kích cỡ
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                      Loại trang phục
                    </label>
                    <select
                      value={item.type}
                      onChange={(e) =>
                        onChange({ ...item, type: e.target.value })
                      }
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5 text-[13px] text-white outline-none focus:border-white/20 transition-all font-black tracking-widest">
                      {COSTUME_TYPES.map((type) => (
                        <option
                          key={type}
                          value={type}
                          className="bg-[#1a1a1a]">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                      Kích cỡ (Size)
                    </label>
                    <select
                      value={item.size}
                      onChange={(e) =>
                        onChange({ ...item, size: e.target.value })
                      }
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5 text-[13px] text-white outline-none focus:border-white/20 transition-all font-black tracking-widest">
                      {SIZES.map((size) => (
                        <option
                          key={size}
                          value={size}
                          className="bg-[#1a1a1a]">
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Chi phí
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Giá thuê/ngày (đ)"
                    type="number"
                    value={item.price}
                    onChange={(v) => onChange({ ...item, price: Number(v) })}
                    min="0"
                  />
                  <InputField
                    label="Tiền cọc (đ)"
                    type="number"
                    value={item.deposit}
                    onChange={(v) => onChange({ ...item, deposit: Number(v) })}
                    min="0"
                  />
                </div>
              </div>

              {/* Status & Notes */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Trạng thái & Ghi chú
                </h4>
                <div className="space-y-2">
                  <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                    Trạng thái
                  </label>
                  <select
                    value={item.status}
                    onChange={(e) =>
                      onChange({
                        ...item,
                        status: e.target.value as ItemStatus,
                      })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5 text-[13px] text-white outline-none focus:border-white/20 transition-all font-black tracking-widest">
                    {STATUS_OPTIONS.map((status) => (
                      <option
                        key={status}
                        value={status}
                        className="bg-[#1a1a1a]">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-white/50 font-black uppercase tracking-widest ml-1">
                    Ghi chú thêm
                  </label>
                  <textarea
                    value={item.note}
                    onChange={(e) =>
                      onChange({ ...item, note: e.target.value })
                    }
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-[13px] text-white outline-none focus:border-white/20 transition-all placeholder:text-white/4 font-bold min-h-[100px] resize-none"
                    placeholder="Thông tin về tình trạng đồ, sửa chữa..."
                  />
                </div>
              </div>

              {/* Image */}
              <div className="space-y-4">
                <h4 className="text-[9px] uppercase font-black text-white/50 tracking-[0.25em] ml-1">
                  Ảnh trang phục
                </h4>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0])}
                    className="w-full text-[12px] text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-[11px] file:font-black file:uppercase file:tracking-widest file:text-white/70 hover:file:bg-white/20"
                  />
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-16 w-16 rounded-2xl object-cover border border-white/10"
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-auto p-8 bg-[#101010] border-t border-white/10 space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 text-[10px] font-black bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/70 uppercase tracking-widest">
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-[2] py-4 text-[10px] font-black bg-white text-black rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] uppercase tracking-widest">
                  Lưu Thay Đổi
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
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: string;
}> = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  min,
}) => (
  <div className="space-y-1.5">
    <label className="text-[9px] text-white font-black uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={min}
      className={`w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white outline-none focus:border-white/20 transition-all placeholder:text-white/4 font-bold ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      placeholder={placeholder}
    />
  </div>
);
