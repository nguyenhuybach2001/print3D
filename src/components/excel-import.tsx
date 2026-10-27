"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  FileSpreadsheet,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Loader2,
} from "lucide-react";

type Target =
  | "settings"
  | "products"
  | "materials"
  | "machines"
  | "print_profiles"
  | "sales_channels"
  | "orders"
  | "order_items"
  | "production_batches"
  | "inventory_transactions"
  | "expenses";

const targets: { value: Target; label: string; sheet: string }[] = [
  { value: "settings", label: "Cấu hình chung", sheet: "CAU_HINH" },
  { value: "products", label: "Sản phẩm", sheet: "SAN_PHAM" },
  { value: "materials", label: "Vật liệu", sheet: "VAT_LIEU" },
  { value: "machines", label: "Máy in", sheet: "MAY_IN" },
  { value: "print_profiles", label: "Cấu hình in & giá thành", sheet: "CAU_HINH_IN" },
  { value: "sales_channels", label: "Kênh bán", sheet: "KENH_BAN" },
  { value: "orders", label: "Đơn hàng", sheet: "DON_HANG" },
  { value: "order_items", label: "Chi tiết đơn hàng", sheet: "CT_DON_HANG" },
  { value: "production_batches", label: "Nhật ký sản xuất", sheet: "SAN_XUAT" },
  { value: "inventory_transactions", label: "Giao dịch tồn kho", sheet: "TON_KHO" },
  { value: "expenses", label: "Chi phí vận hành", sheet: "CHI_PHI" },
];

const mappings: Record<Target, Record<string, string>> = {
  settings: {
    ma_cau_hinh: "setting_key",
    "mã cấu hình": "setting_key",
    gia_tri: "setting_value",
    "giá trị": "setting_value",
    don_vi: "unit",
    "đơn vị": "unit",
    ghi_chu: "notes",
    "ghi chú": "notes",
  },
  products: {
    sku: "sku",
    ten_san_pham: "name",
    "tên sản phẩm": "name",
    nhom: "category",
    "nhóm": "category",
    bien_the: "variant",
    "biến thể": "variant",
    vat_lieu_chinh: "main_material_code",
    "vật liệu chính": "main_material_code",
    ma_profile: "print_profile_code",
    gia_ban_de_xuat_vnd: "sale_price",
    gia_tham_khao_vnd: "reference_price",
    trang_thai: "status",
    ghi_chu: "description",
  },
  materials: {
    ma_vl: "code",
    ten_vat_lieu: "name",
    loai: "material_type",
    thuong_hieu: "brand",
    mau: "color",
    don_vi: "unit",
    gia_mua_vnd: "purchase_price",
    khoi_luong_tinh_g: "mass_grams",
    gia_vnd_moi_g: "cost_per_gram",
    ton_dau_don_vi: "opening_stock",
    ton_canh_bao: "low_stock_threshold",
    ghi_chu: "description",
  },
  machines: {
    ma_may: "code",
    ten_may: "name",
    gia_may_va_phu_kien_vnd: "purchase_price",
    tong_gio_su_dung_du_kien: "expected_hours",
    khau_hao_vnd_gio: "depreciation_per_hour",
    bao_tri_vnd_gio: "maintenance_per_hour",
    cong_suat_trung_binh_kw: "average_power_kw",
    ghi_chu: "notes",
  },
  print_profiles: {
    ma_profile: "code",
    sku: "sku",
    ten_profile: "name",
    ma_may: "machine_code",
    ma_vl: "material_code",
    tong_filament_g_moi_lan_in: "filament_per_run_g",
    so_sp_moi_lan_in: "units_per_run",
    thoi_gian_in_gio: "print_hours",
    phut_cong_moi_sp: "labor_minutes_per_unit",
    phut_thiet_ke_tong: "design_minutes_total",
    sl_du_kien_phan_bo_thiet_ke: "expected_sales_units",
    ty_le_loi: "defect_rate",
  },
  sales_channels: {
    ma_kenh: "code",
    ten_kenh: "name",
    phi_phan_tram: "fee_rate",
    phi_co_dinh_moi_don_vnd: "fixed_fee_per_order",
    phi_dong_goi_moi_don_vnd: "packaging_per_order",
    ghi_chu: "notes",
  },
  orders: {
    ma_don: "order_number",
    ngay_dat: "ordered_at",
    ma_kenh: "channel_code",
    ma_don_kenh: "external_order_number",
    trang_thai: "status",
    phi_van_chuyen_shop_chiu_vnd: "shipping_cost",
    giam_gia_shop_tu_chiu_vnd: "seller_discount",
    hoan_tien_vnd: "refund_amount",
    ghi_chu: "notes",
  },
  order_items: {
    ma_dong: "line_code",
    ma_don: "order_number",
    sku: "sku",
    so_luong: "quantity",
    don_gia_vnd: "unit_price",
    giam_gia_dong_vnd: "seller_discount",
    gia_thanh_moi_sp_vnd: "unit_cost_snapshot",
    phi_kenh_vnd: "channel_fee",
    phi_co_dinh_phan_bo_vnd: "fixed_fee_allocated",
    bao_bi_moi_sp_vnd: "packaging_per_unit",
    ghi_chu: "notes",
  },
  production_batches: {
    ma_me: "code",
    ngay_in: "produced_at",
    ma_profile: "profile_code",
    ma_may: "machine_code",
    so_luong_dat: "good_quantity",
    so_luong_loi: "failed_quantity",
    thoi_gian_thuc_te_gio: "actual_hours",
    filament_thuc_te_g: "actual_filament_g",
    chi_phi_may_vnd: "machine_cost",
    chi_phi_nhua_vnd: "material_cost",
    chi_phi_cong_vnd: "labor_cost",
    tong_chi_phi_mo_vnd: "total_cost",
    ghi_chu: "notes",
  },
  inventory_transactions: {
    ma_giao_dich: "code",
    ngay: "occurred_at",
    loai_hang: "item_type",
    ma_hang: "item_code",
    don_vi: "unit",
    so_luong_tang_giam: "quantity_delta",
    don_gia_vnd_don_vi: "unit_cost",
    thanh_tien_vnd: "amount",
    ly_do: "reason",
    lien_ket_don_me: "linked_batch_or_order",
  },
  expenses: {
    ma_chi_phi: "code",
    ngay: "occurred_at",
    nhom_chi_phi: "category",
    noi_dung: "description",
    so_tien_vnd: "amount",
    phan_bo_cho_sku: "allocated_sku",
    phan_bo_cho_don: "allocated_order",
    ghi_chu: "notes",
  },
};

const numericFields = new Set([
  "setting_value",
  "sale_price",
  "reference_price",
  "purchase_price",
  "mass_grams",
  "cost_per_gram",
  "opening_stock",
  "low_stock_threshold",
  "expected_hours",
  "depreciation_per_hour",
  "maintenance_per_hour",
  "average_power_kw",
  "filament_per_run_g",
  "units_per_run",
  "print_hours",
  "labor_minutes_per_unit",
  "design_minutes_total",
  "expected_sales_units",
  "defect_rate",
  "fee_rate",
  "fixed_fee_per_order",
  "packaging_per_order",
  "quantity",
  "unit_price",
  "seller_discount",
  "unit_cost_snapshot",
  "channel_fee",
  "fixed_fee_allocated",
  "packaging_per_unit",
  "good_quantity",
  "failed_quantity",
  "actual_hours",
  "actual_filament_g",
  "machine_cost",
  "material_cost",
  "labor_cost",
  "total_cost",
  "quantity_delta",
  "unit_cost",
  "amount",
]);

const translatedStatuses: Record<string, string> = {
  "chờ xác nhận": "pending",
  "đã xác nhận": "confirmed",
  "đang in": "printing",
  "đóng gói": "packing",
  "đã gửi": "shipped",
  "đang giao": "shipped",
  "đã giao": "completed",
  "hoàn thành": "completed",
  "đã hủy": "cancelled",
};

const headers = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");

export function ExcelImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState<Target>("orders");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState("");
  const [headerRow, setHeaderRow] = useState(4);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const workbookMode = Boolean(workbook?.SheetNames.some((name) => targets.some((target) => target.sheet === name)));

  function parseSheet(wb: XLSX.WorkBook, sheetName: string, target: Target, header: number) {
    const worksheet = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      range: Math.max(0, header - 1),
      raw: true,
    });
    const map = mappings[target];
    return raw
      .map((source) => {
        const row = Object.fromEntries(
          Object.entries(source).flatMap(([sourceHeader, sourceValue]) => {
            const field = map[headers(sourceHeader)];
            if (!field || sourceValue === "" || sourceValue === undefined || sourceValue === null) return [];
            if (numericFields.has(field)) {
              const cleaned = String(sourceValue).replace(/[^\d,.-]/g, "");
              const normalized =
                cleaned.includes(",") && cleaned.includes(".")
                  ? cleaned.replace(/\./g, "").replace(",", ".")
                  : cleaned.replace(",", ".");
              const parsed = Number(normalized);
              return Number.isFinite(parsed) ? [[field, parsed]] : [];
            }
            if (field === "status") return [[field, translatedStatuses[headers(sourceValue)] ?? String(sourceValue)]];
            return [[field, sourceValue]];
          })
        );
        return row;
      })
      .filter((row) => Object.keys(row).length > 0);
  }

  function reparse(wb = workbook, sheetName = sheet, target = table, header = headerRow) {
    if (!wb || !sheetName) return;
    try {
      const parsed = parseSheet(wb, sheetName, target, header);
      setRows(parsed);
      setMessage(parsed.length ? "" : "Không tìm thấy dòng dữ liệu có cột khớp. Kiểm tra sheet và hàng tiêu đề.");
    } catch {
      setRows([]);
      setMessage("Không đọc được sheet đã chọn.");
    }
  }

  async function chooseFile(file?: File) {
    setMessage("");
    setConfirmed(false);
    setRows([]);
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setMessage("Vui lòng chọn file Excel .xlsx, .xls hoặc .csv.");
      return;
    }
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
      const suggested =
        targets.find((item) => item.value === table && wb.SheetNames.includes(item.sheet))?.sheet ?? wb.SheetNames[0];
      const isTemplate = wb.SheetNames.some((name) => targets.some((item) => item.sheet === name));
      const row = isTemplate ? 4 : 1;
      setWorkbook(wb);
      setFileName(file.name);
      setSheet(suggested);
      setHeaderRow(row);
      const parsed = parseSheet(wb, suggested, table, row);
      setRows(parsed);
      if (!parsed.length) setMessage("Sheet này chưa có dữ liệu khớp. Chọn sheet đúng ở danh sách bên dưới.");
    } catch {
      setMessage("Không đọc được file. Hãy kiểm tra định dạng và thử lại.");
    }
  }

  function changeTarget(value: Target) {
    setTable(value);
    setConfirmed(false);
    setMessage("");
    const nextSheet = workbook?.SheetNames.includes(targets.find((item) => item.value === value)!.sheet)
      ? targets.find((item) => item.value === value)!.sheet
      : sheet;
    setSheet(nextSheet);
    if (workbook) reparse(workbook, nextSheet, value, headerRow);
  }

  async function importRows() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, rows }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Nhập dữ liệu thất bại.");
      setMessage(`Đã nhập ${result.imported} dòng vào ${targets.find((item) => item.value === table)?.label}. Tải lại trang để cập nhật.`);
      setRows([]);
      setConfirmed(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Không thể nhập dữ liệu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="secondary-button" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        <span>Nhập Excel</span>
      </button>

      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
              <div className="modal-heading">
                <div>
                  <h2 id="import-title" className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span>Nhập dữ liệu từ Excel / Workbook</span>
                  </h2>
                  <p>Nhập hàng loạt đơn hàng, nguyên vật liệu hoặc cấu hình xưởng từ file tính.</p>
                </div>
                <button className="modal-close" onClick={() => setOpen(false)} aria-label="Đóng">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="field-label">
                  <span>Dữ liệu đích cần nhập vào</span>
                  <select value={table} onChange={(event) => changeTarget(event.target.value as Target)}>
                    {targets.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label} ({item.sheet})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="upload-drop" onClick={() => inputRef.current?.click()}>
                  <div className="upload-symbol">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <strong>{fileName || "Kéo thả hoặc bấm để chọn file Excel"}</strong>
                  <small>Hỗ trợ định dạng .xlsx, .xls, .csv</small>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    hidden
                    onChange={(event) => void chooseFile(event.target.files?.[0])}
                  />
                </div>

                {workbook && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="field-label">
                      <span>Chọn Sheet</span>
                      <select
                        value={sheet}
                        onChange={(event) => {
                          setSheet(event.target.value);
                          reparse(workbook, event.target.value);
                        }}
                      >
                        {workbook.SheetNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-label">
                      <span>Hàng tiêu đề</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={headerRow}
                        onChange={(event) => {
                          const row = Math.max(1, Number(event.target.value));
                          setHeaderRow(row);
                          reparse(workbook, sheet, table, row);
                        }}
                      />
                    </label>
                  </div>
                )}

                {rows.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        Tìm thấy {rows.length} dòng dữ liệu hợp lệ
                      </span>
                      <span className="text-emerald-700">Sheet: {sheet}</span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-36">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            {Object.keys(rows[0])
                              .slice(0, 5)
                              .map((key) => (
                                <th key={key} className="px-3 py-2 whitespace-nowrap">
                                  {key}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              {Object.keys(rows[0])
                                .slice(0, 5)
                                .map((key) => (
                                  <td key={key} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                                    {String(row[key] ?? "—")}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {workbookMode && (
                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-indigo-600"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>Tôi đã kiểm tra dữ liệu xem trước và muốn nhập vào hệ thống.</span>
                  </label>
                )}

                {message && (
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>{message}</span>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button className="cancel-button" onClick={() => setOpen(false)}>
                  Hủy bỏ
                </button>
                <button
                  className="primary-button"
                  disabled={!rows.length || busy || (workbookMode && !confirmed)}
                  onClick={() => void importRows()}
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang nạp…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Nhập {rows.length || ""} dòng vào bảng</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}
