import { NextResponse } from "next/server";
import { verifyRequestSession } from "@/lib/session";

const tables = {
  settings: { key: "setting_key", fields: ["setting_key", "setting_value", "unit", "notes"] },
  products: { key: "sku", fields: ["sku", "name", "category", "variant", "main_material_code", "print_profile_code", "sale_price", "reference_price", "status", "description"] },
  materials: { key: "code", fields: ["code", "name", "material_type", "brand", "color", "unit", "purchase_price", "mass_grams", "cost_per_gram", "quantity", "opening_stock", "low_stock_threshold", "description"] },
  machines: { key: "code", fields: ["code", "name", "purchase_price", "expected_hours", "depreciation_per_hour", "maintenance_per_hour", "average_power_kw", "notes"] },
  print_profiles: { key: "code", fields: ["code", "sku", "name", "machine_code", "material_code", "filament_per_run_g", "units_per_run", "print_hours", "labor_minutes_per_unit", "design_minutes_total", "expected_sales_units", "defect_rate", "notes"] },
  sales_channels: { key: "code", fields: ["code", "name", "fee_rate", "fixed_fee_per_order", "packaging_per_order", "notes"] },
  orders: { key: "order_number", fields: ["order_number", "channel", "channel_code", "external_order_number", "ordered_at", "total_amount", "profit", "status", "shipping_cost", "seller_discount", "refund_amount", "notes"] },
  order_items: { key: "line_code", fields: ["line_code", "order_number", "sku", "quantity", "unit_price", "seller_discount", "unit_cost_snapshot", "channel_fee", "fixed_fee_allocated", "packaging_per_unit", "notes"] },
  production_batches: { key: "code", fields: ["code", "produced_at", "profile_code", "machine_code", "good_quantity", "failed_quantity", "actual_hours", "actual_filament_g", "machine_cost", "material_cost", "labor_cost", "total_cost", "notes"] },
  inventory_transactions: { key: "code", fields: ["code", "occurred_at", "item_type", "item_code", "unit", "quantity_delta", "unit_cost", "amount", "reason", "linked_batch_or_order"] },
  expenses: { key: "code", fields: ["code", "occurred_at", "category", "description", "amount", "allocated_sku", "allocated_order", "notes"] },
} as const;

type ImportTable = keyof typeof tables;

export async function POST(request: Request) {
  if (!verifyRequestSession(request)) return NextResponse.json({ error: "Phiên đăng nhập hết hạn. Hãy đăng nhập lại." }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return NextResponse.json({ error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trong biến môi trường server." }, { status: 503 });

  let body: { table?: ImportTable; rows?: Record<string, unknown>[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 }); }
  if (!body.table || !(body.table in tables)) return NextResponse.json({ error: "Bảng đích không hợp lệ." }, { status: 400 });
  if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 1000) return NextResponse.json({ error: "Chọn từ 1 đến 1.000 dòng dữ liệu." }, { status: 400 });

  const config = tables[body.table];
  const rows = body.rows.map((row) => Object.fromEntries(Object.entries(row).filter(([field]) => (config.fields as readonly string[]).includes(field))));
  if (rows.some((row) => typeof row[config.key] !== "string" || !String(row[config.key]).trim())) return NextResponse.json({ error: `Có dòng thiếu khóa bắt buộc ${config.key}.` }, { status: 400 });

  if (body.table === "materials") {
    for (const row of rows) {
      const mass = Number(row.mass_grams || 0);
      const price = Number(row.purchase_price || 0);
      if (!row.cost_per_gram && mass > 0 && price > 0) row.cost_per_gram = price / mass;
      if (row.quantity === undefined && row.opening_stock !== undefined) row.quantity = row.opening_stock;
      if (row.opening_stock === undefined && row.quantity !== undefined) row.opening_stock = row.quantity;
    }
  }
  if (body.table === "machines") {
    for (const row of rows) {
      if (!row.depreciation_per_hour && Number(row.expected_hours) > 0) row.depreciation_per_hour = Number(row.purchase_price || 0) / Number(row.expected_hours);
    }
  }
  if (body.table === "order_items") {
    const read = async (table: string, query: string) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Không đọc được ${table} để tính dòng đơn (${response.status}).`);
      return response.json() as Promise<Record<string, unknown>[]>;
    };
    const [costRows, channels, orders] = await Promise.all([
      read("profile_costing", "select=sku,estimated_unit_cost"),
      read("sales_channels", "select=code,fee_rate,fixed_fee_per_order,packaging_per_order"),
      read("orders", "select=order_number,channel_code,channel"),
    ]);
    const costs = new Map(costRows.map((item) => [String(item.sku), Number(item.estimated_unit_cost || 0)]));
    const channelRows = new Map(channels.map((item) => [String(item.code), item]));
    const orderRows = new Map(orders.map((item) => [String(item.order_number), item]));
    const lineCounts = new Map<string, number>();
    const quantities = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.order_number);
      lineCounts.set(key, (lineCounts.get(key) || 0) + 1);
      quantities.set(key, (quantities.get(key) || 0) + Number(row.quantity || 1));
    }
    for (const row of rows) {
      const order = orderRows.get(String(row.order_number));
      const channel = channelRows.get(String(order?.channel_code || ""));
      const quantity = Number(row.quantity || 1);
      const net = Math.max(0, quantity * Number(row.unit_price || 0) - Number(row.seller_discount || 0));
      if (!row.unit_cost_snapshot) row.unit_cost_snapshot = costs.get(String(row.sku)) || 0;
      if (!row.channel_fee) row.channel_fee = net * Number(channel?.fee_rate || 0);
      if (!row.fixed_fee_allocated) row.fixed_fee_allocated = Number(channel?.fixed_fee_per_order || 0) / Math.max(1, lineCounts.get(String(row.order_number)) || 1);
      if (!row.packaging_per_unit) row.packaging_per_unit = Number(channel?.packaging_per_order || 0) / Math.max(1, quantities.get(String(row.order_number)) || quantity);
    }
  }
  if (body.table === "production_batches") {
    const read = async (table: string, query: string) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(`Không đọc được ${table} để tính chi phí mẻ (${response.status}).`);
      return response.json() as Promise<Record<string, unknown>[]>;
    };
    const [profiles, machines, materials, settings] = await Promise.all([
      read("print_profiles", "select=code,labor_minutes_per_unit"),
      read("machines", "select=code,depreciation_per_hour,maintenance_per_hour,average_power_kw"),
      read("materials", "select=code,cost_per_gram"),
      read("settings", "select=setting_key,setting_value"),
    ]);
    const profileByCode = new Map(profiles.map((item) => [String(item.code), item]));
    const machineByCode = new Map(machines.map((item) => [String(item.code), item]));
    const laborRate = Number(settings.find((item) => item.setting_key === "DON_GIA_CON_GIO")?.setting_value || 0);
    const electricityRate = Number(settings.find((item) => item.setting_key === "GIA_DIEN_KWH")?.setting_value || 0);
    for (const row of rows) {
      const profile = profileByCode.get(String(row.profile_code));
      const machine = machineByCode.get(String(row.machine_code));
      const materialCode = String(profile?.material_code || "");
      const material = materials.find((item) => item.code === materialCode);
      const hours = Number(row.actual_hours || 0);
      const filament = Number(row.actual_filament_g || 0);
      if (!row.machine_cost) row.machine_cost = hours * (Number(machine?.depreciation_per_hour || 0) + Number(machine?.maintenance_per_hour || 0) + Number(machine?.average_power_kw || 0) * electricityRate);
      if (!row.material_cost) row.material_cost = filament * Number(material?.cost_per_gram || 0);
      if (!row.labor_cost) row.labor_cost = Number(profile?.labor_minutes_per_unit || 0) * Number(row.good_quantity || 0) / 60 * laborRate;
      if (!row.total_cost) row.total_cost = Number(row.machine_cost) + Number(row.material_cost) + Number(row.labor_cost);
    }
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${body.table}?on_conflict=${config.key}`, {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows), cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: `Supabase từ chối dữ liệu (${response.status}): ${(await response.text()).slice(0, 400)}` }, { status: 422 });
  return NextResponse.json({ imported: rows.length });
}
