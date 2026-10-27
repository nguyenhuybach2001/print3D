import { NextResponse } from "next/server";
import { workbookModules } from "@/lib/workbook-modules";
import { verifyRequestSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!verifyRequestSession(request)) return NextResponse.json({ error: "Phiên đăng nhập hết hạn. Hãy đăng nhập lại." }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL;
  if (!serviceKey || !url) return NextResponse.json({ error: "Cấu hình SUPABASE_SERVICE_ROLE_KEY trước." }, { status: 503 });

  let body: { action?: string; section?: string; record?: Record<string, unknown>; keyValue?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 }); }
  const section = body.section ?? "";
  const moduleSpec = workbookModules[section];
  if (!moduleSpec && section !== "reports") return NextResponse.json({ error: "Không tìm thấy module." }, { status: 404 });

  async function requestTable(table: string, query = "select=*") {
    const response = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new Error(`Supabase ${table} (${response.status}): ${(await response.text()).slice(0, 250)}`);
    return response.json() as Promise<Record<string, unknown>[]>;
  }

  try {
    if (section === "reports" && body.action === "list") {
      const [orders, expenses, batches, items] = await Promise.all([
        requestTable("orders", "select=ordered_at,total_amount,profit,status&order=ordered_at.desc"),
        requestTable("expenses", "select=occurred_at,amount"),
        requestTable("production_batches", "select=actual_hours,good_quantity,failed_quantity"),
        requestTable("order_items", "select=quantity"),
      ]);
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      const monthlyOrders = orders.filter((item) => new Date(String(item.ordered_at)) >= start && item.status !== "cancelled");
      const monthlyExpenses = expenses.filter((item) => new Date(String(item.occurred_at)) >= start);
      return NextResponse.json({ report: {
        revenue: monthlyOrders.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
        grossProfit: monthlyOrders.reduce((sum, item) => sum + Number(item.profit || 0), 0),
        expenses: monthlyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        netProfit: monthlyOrders.reduce((sum, item) => sum + Number(item.profit || 0), 0) - monthlyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        orderCount: monthlyOrders.length,
        unitsSold: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        machineHours: batches.reduce((sum, item) => sum + Number(item.actual_hours || 0), 0),
        failedUnits: batches.reduce((sum, item) => sum + Number(item.failed_quantity || 0), 0),
      } });
    }
    if (!moduleSpec) return NextResponse.json({ error: "Module không hợp lệ." }, { status: 400 });

    if (body.action === "list") {
      const rows = await requestTable(moduleSpec.table, `select=*&order=${encodeURIComponent(moduleSpec.key)}.asc&limit=500`);
      if (section === "print_profiles") {
        const [costs, pricing] = await Promise.all([
          requestTable("profile_costing", "select=code,estimated_unit_cost"),
          requestTable("product_channel_pricing", "select=profile_code,channel_code,target_sale_price"),
        ]);
        const costByCode = new Map(costs.map((row) => [String(row.code), row.estimated_unit_cost]));
        return NextResponse.json({ rows: rows.map((row) => ({ ...row, estimated_unit_cost: costByCode.get(String(row.code)) ?? null })), pricing });
      }
      return NextResponse.json({ rows });
    }
    if (body.action === "save") {
      if (!body.record || typeof body.record !== "object") return NextResponse.json({ error: "Bản ghi trống." }, { status: 400 });
      const allowed = new Set(moduleSpec.fields.filter((field) => !field.computed).map((field) => field.key));
      const record = Object.fromEntries(Object.entries(body.record).filter(([key]) => allowed.has(key)));
      if (!record[moduleSpec.key]) return NextResponse.json({ error: `Thiếu trường ${moduleSpec.key}.` }, { status: 400 });
      if (section === "machines" && !record.depreciation_per_hour && Number(record.expected_hours) > 0) record.depreciation_per_hour = Number(record.purchase_price || 0) / Number(record.expected_hours);
      const response = await fetch(`${url}/rest/v1/${moduleSpec.table}?on_conflict=${moduleSpec.key}`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(record), cache: "no-store" });
      if (!response.ok) throw new Error(`Supabase từ chối lưu (${response.status}): ${(await response.text()).slice(0, 250)}`);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "delete") {
      if (!body.keyValue) return NextResponse.json({ error: "Thiếu mã bản ghi." }, { status: 400 });
      const response = await fetch(`${url}/rest/v1/${moduleSpec.table}?${moduleSpec.key}=eq.${encodeURIComponent(body.keyValue)}`, { method: "DELETE", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=minimal" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Supabase từ chối xóa (${response.status}): ${(await response.text()).slice(0, 250)}`);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Thao tác không hỗ trợ." }, { status: 400 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Không thể truy cập dữ liệu.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
