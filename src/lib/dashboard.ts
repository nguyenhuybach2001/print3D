import "server-only";

type Order = { id: string; order_number: string; channel: string; ordered_at: string; total_amount: number; status: string; profit: number };
type Material = { id: string; name: string; brand: string | null; quantity: number; low_stock_threshold: number };

const baseUrl = process.env.SUPABASE_URL;
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function selectRows<T>(table: string, query: string): Promise<T[]> {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: apiKey!, Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  return response.json() as Promise<T[]>;
}

export async function getDashboardData() {
  const empty = { orders: [] as Order[], materials: [] as Material[], totals: { revenue: 0, profit: 0, pendingOrders: 0, inventoryUnits: 0 } };
  if (!baseUrl || !apiKey) return { ...empty, configured: false, error: "Hãy thêm SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY vào file .env.local theo hướng dẫn README." };

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [orders, materials] = await Promise.all([
      selectRows<Order>("orders", "select=id,order_number,channel,ordered_at,total_amount,status,profit&order=ordered_at.desc&limit=1000"),
      selectRows<Material>("materials", "select=id,name,brand,quantity,low_stock_threshold&order=name.asc"),
    ]);
    const monthlyOrders = orders.filter((order) => new Date(order.ordered_at) >= monthStart && order.status !== "cancelled");
    return {
      configured: true,
      error: null,
      orders: orders.slice(0, 8),
      materials,
      totals: {
        revenue: monthlyOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
        profit: monthlyOrders.reduce((sum, order) => sum + Number(order.profit || 0), 0),
        pendingOrders: orders.filter((order) => !["completed", "cancelled"].includes(order.status)).length,
        inventoryUnits: materials.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      },
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Không thể tải dữ liệu.";
    return { ...empty, configured: true, error: `${message}. Kiểm tra schema SQL và quyền truy cập trong Supabase.` };
  }
}
