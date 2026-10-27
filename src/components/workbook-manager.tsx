"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { ModuleSpec } from "@/lib/workbook-modules";
import {
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Database,
  Loader2,
  TrendingUp,
  Receipt,
  Scale,
  ShoppingBag,
  Box,
  Clock,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

type Row = Record<string, string | number | null>;
const emptyFields: ModuleSpec["fields"] = [];

export function WorkbookManager({ section, spec }: { section: string; spec: ModuleSpec | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pricing, setPricing] = useState<Row[]>([]);
  const [report, setReport] = useState<Record<string, number> | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const fields = spec?.fields ?? emptyFields;
  const displayFields = useMemo(
    () =>
      section === "print_profiles"
        ? ["code", "sku", "name", "estimated_unit_cost", "filament_per_run_g", "print_hours"].flatMap((key) =>
            fields.filter((field) => field.key === key)
          )
        : fields.slice(0, section === "products" || section === "materials" || section === "orders" ? 7 : 6),
    [fields, section]
  );

  async function callApi(payload: Record<string, unknown>) {
    const response = await fetch("/api/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Thao tác thất bại.");
    return result;
  }

  const loadData = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await callApi({ action: "list", section });
      if (section === "reports") {
        setReport(result.report);
      } else {
        setRows(result.rows ?? []);
        if (section === "print_profiles") setPricing(result.pricing ?? []);
      }
    } catch (cause) {
      setMessageType("error");
      setMessage(cause instanceof Error ? cause.message : "Không tải được dữ liệu.");
    } finally {
      setBusy(false);
    }
  }, [section]);

  // Automatically load data on mount or when section changes
  useEffect(() => {
    let ignore = false;
    async function fetchList() {
      try {
        const result = await callApi({ action: "list", section });
        if (ignore) return;
        if (section === "reports") {
          setReport(result.report);
        } else {
          setRows(result.rows ?? []);
          if (section === "print_profiles") setPricing(result.pricing ?? []);
        }
      } catch (cause) {
        if (ignore) return;
        setMessageType("error");
        setMessage(cause instanceof Error ? cause.message : "Không tải được dữ liệu.");
      }
    }
    void fetchList();
    return () => {
      ignore = true;
    };
  }, [section]);

  function startNew() {
    setEditingKey(null);
    setForm(Object.fromEntries(fields.map((field) => [field.key, ""])));
    setEditorOpen(true);
  }

  function startEdit(row: Row) {
    const key = spec?.key;
    setEditingKey(key ? String(row[key] ?? "") : null);
    setForm(
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          row[field.key] === null || row[field.key] === undefined
            ? ""
            : String(row[field.key]).slice(0, field.type === "date" ? 10 : undefined),
        ])
      )
    );
    setEditorOpen(true);
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const record: Record<string, unknown> = {};
      for (const field of fields) {
        const value = form[field.key]?.trim() ?? "";
        if (!value) continue;
        record[field.key] = field.type === "number" ? Number(value) : value;
      }
      await callApi({ action: "save", section, record });
      setEditorOpen(false);
      await loadData();
      setMessageType("success");
      setMessage("Đã lưu bản ghi thành công.");
    } catch (cause) {
      setMessageType("error");
      setMessage(cause instanceof Error ? cause.message : "Không lưu được bản ghi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!spec || !window.confirm(`Xác nhận xóa "${String(row[spec.key] ?? "bản ghi này")}"? Hành động này không thể hoàn tác.`)) return;
    setBusy(true);
    setMessage("");
    try {
      await callApi({ action: "delete", section, keyValue: String(row[spec.key] ?? "") });
      await loadData();
      setMessageType("success");
      setMessage("Đã xóa bản ghi thành công.");
    } catch (cause) {
      setMessageType("error");
      setMessage(cause instanceof Error ? cause.message : "Không xóa được bản ghi.");
    } finally {
      setBusy(false);
    }
  }

  const currency = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? "").toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const reportCards = [
    { key: "revenue", label: "Doanh thu tháng này", icon: TrendingUp, color: "emerald", isCurrency: true },
    { key: "grossProfit", label: "Lợi nhuận theo đơn", icon: DollarSign, color: "indigo", isCurrency: true },
    { key: "expenses", label: "Chi phí vận hành tháng", icon: Receipt, color: "amber", isCurrency: true },
    { key: "netProfit", label: "Lợi nhuận ròng sau chi phí", icon: Scale, color: "indigo", isCurrency: true },
    { key: "orderCount", label: "Đơn hàng trong tháng", icon: ShoppingBag, color: "cyan", unit: "đơn" },
    { key: "unitsSold", label: "Sản phẩm đã bán (toàn kỳ)", icon: Box, color: "indigo", unit: "sản phẩm" },
    { key: "machineHours", label: "Giờ máy ghi nhận (toàn kỳ)", icon: Clock, color: "cyan", unit: "giờ" },
    { key: "failedUnits", label: "Sản phẩm hỏng / lỗi", icon: AlertTriangle, color: "amber", unit: "sản phẩm" },
  ];

  return (
    <div className="manage-content">
      {/* PAGE HEADER */}
      <div className="manager-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> QUẢN LÝ DỮ LIỆU
          </div>
          <h1>{spec?.title ?? "Báo cáo kinh doanh"}</h1>
          <p>{spec?.description ?? "Tổng hợp doanh thu, chi phí, sản xuất và hiệu quả vận hành."}</p>
        </div>

        {spec && (
          <button className="primary-button" onClick={startNew}>
            <Plus className="w-4 h-4" />
            <span>Thêm bản ghi mới</span>
          </button>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="manager-toolbar">
        {spec ? (
          <div className="search-input-wrap">
            <Search className="search-icon-pos w-4 h-4" />
            <input
              type="text"
              placeholder={`Tìm kiếm trong ${rows.length} bản ghi...`}
              className="manager-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium">Báo cáo kinh doanh tổng hợp từ dữ liệu xưởng</div>
        )}

        <div className="manager-toolbar-actions">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Khóa chính: <strong className="text-slate-700 font-mono">{spec?.key ?? "id"}</strong>
          </span>

          <button
            className="secondary-button !h-9 text-xs"
            disabled={busy}
            onClick={() => void loadData()}
            title="Tải lại dữ liệu mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin text-indigo-600" : ""}`} />
            <span>{busy ? "Đang tải…" : "Làm mới"}</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK MESSAGE */}
      {message && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
          role="status"
        >
          {messageType === "success" ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* REPORTS SECTION */}
      {section === "reports" && report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((card) => {
            const IconComp = card.icon;
            const val = report[card.key] ?? 0;
            return (
              <article className="stat-card" key={card.key}>
                <div className="stat-top">
                  <span className="stat-title">{card.label}</span>
                  <div className={`stat-icon ${card.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                </div>
                <div className="stat-value">
                  {card.isCurrency ? `${currency.format(val)} ₫` : currency.format(val)}
                  {card.unit && <span className="stat-unit">{card.unit}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MAIN DATA TABLE */}
      {spec && (
        <div className="panel manager-table-panel">
          <div className="manager-table-head">
            <div className="flex items-center gap-2">
              <strong>Danh sách dữ liệu</strong>
              <span className="heading-badge">
                {filteredRows.length} {searchTerm ? `/ ${rows.length}` : ""} dòng
              </span>
            </div>
            <span>Giới hạn 500 bản ghi</span>
          </div>

          <div className="manager-table-scroll">
            <table>
              <thead>
                <tr>
                  {displayFields.map((field) => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                  <th className="text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={String(row[spec.key] ?? index)}>
                    {displayFields.map((field) => {
                      const val = row[field.key];
                      const isNumber = field.type === "number" && val !== null && val !== undefined;
                      const isPrimaryKey = field.key === spec.key;

                      return (
                        <td key={field.key} className={isPrimaryKey ? "font-mono font-semibold text-indigo-600" : ""}>
                          {isNumber ? currency.format(Number(val)) : String(val ?? "—")}
                        </td>
                      );
                    })}
                    <td className="text-right">
                      <div className="row-actions justify-end">
                        <button
                          className="action-btn edit"
                          onClick={() => startEdit(row)}
                          title="Chỉnh sửa bản ghi"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => void remove(row)}
                          title="Xóa bản ghi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className="empty-state-box">
                <div className="empty-icon-circle">
                  <Database className="w-5 h-5 text-indigo-500" />
                </div>
                <h3>{searchTerm ? "Không có kết quả tìm kiếm phù hợp" : "Chưa có bản ghi nào"}</h3>
                <p>
                  {searchTerm
                    ? "Hãy thử tìm bằng từ khóa hoặc mã SKU khác."
                    : "Bấm nút \"Thêm bản ghi mới\" hoặc nhập dữ liệu từ file Excel."}
                </p>
                {!searchTerm && (
                  <button className="primary-button mt-4" onClick={startNew}>
                    <Plus className="w-4 h-4" />
                    <span>Thêm bản ghi đầu tiên</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT PROFILES: PRICING RECOMMENDATIONS */}
      {section === "print_profiles" && pricing.length > 0 && (
        <div className="panel manager-table-panel">
          <div className="manager-table-head">
            <div>
              <strong>Giá bán mục tiêu theo kênh</strong>
              <p className="text-xs text-slate-400 mt-0.5">Tự động cộng phí kênh và biên lợi nhuận kỳ vọng</p>
            </div>
            <span className="heading-badge">{pricing.length} kênh</span>
          </div>

          <div className="manager-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>MÃ PROFILE</th>
                  <th>KÊNH BÁN</th>
                  <th>GIÁ BÁN MỤC TIÊU</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row, index) => (
                  <tr key={`${row.profile_code}-${row.channel_code}-${index}`}>
                    <td className="font-mono font-semibold text-slate-800">{String(row.profile_code ?? "—")}</td>
                    <td>
                      <span className="channel-pill channel-shopee">{String(row.channel_code ?? "—")}</span>
                    </td>
                    <td className="font-mono font-bold text-emerald-600 text-sm">
                      {row.target_sale_price === null
                        ? "Chưa đủ dữ liệu phí"
                        : `${currency.format(Number(row.target_sale_price))} ₫`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREATE / EDIT RECORD */}
      {editorOpen && spec && typeof document !== "undefined" &&
        createPortal(
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setEditorOpen(false);
            }}
          >
            <section className="import-modal record-modal" role="dialog" aria-modal="true" aria-labelledby="record-title">
              <div className="modal-heading">
                <div>
                  <h2 id="record-title">{editingKey ? `Sửa bản ghi: ${editingKey}` : "Thêm bản ghi mới"}</h2>
                  <p>{spec.title} — Nhập các trường thông tin chi tiết</p>
                </div>
                <button className="modal-close" onClick={() => setEditorOpen(false)} aria-label="Đóng">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="record-fields max-h-[60vh] overflow-y-auto pr-1">
                {fields
                  .filter((field) => !field.computed)
                  .map((field) => (
                    <label className="field-label" key={field.key}>
                      <span className="flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </span>
                      <input
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                        step={field.step}
                        required={field.required}
                        disabled={editingKey !== null && field.key === spec.key}
                        placeholder={`Nhập ${field.label.toLowerCase()}...`}
                        value={form[field.key] ?? ""}
                        onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                      />
                    </label>
                  ))}
              </div>

              <div className="modal-actions">
                <button className="cancel-button" onClick={() => setEditorOpen(false)}>
                  Hủy bỏ
                </button>
                <button className="primary-button" disabled={busy} onClick={() => void save()}>
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingKey ? "Cập nhật bản ghi" : "Lưu bản ghi"}</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  );
}
