import { getDashboardData } from "@/lib/dashboard";
import { connection } from "next/server";
import { ExcelImport } from "@/components/excel-import";
import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { LoginGate } from "@/components/login-gate";
import { LogoutButton } from "@/components/logout-button";
import { sessionCookieName, verifySession } from "@/lib/session";
import {
  LayoutDashboard,
  ShoppingBag,
  ListOrdered,
  Box,
  SlidersHorizontal,
  Printer,
  Cpu,
  PackageCheck,
  ArrowLeftRight,
  Store,
  Settings,
  Receipt,
  BarChart3,
  Calendar,
  ChevronRight,
  TrendingUp,
  CircleDollarSign,
  Clock,
  Boxes,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("vi-VN");

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-indigo-600 font-medium">Đang tải dữ liệu B3D Lab…</div>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  await connection();
  const cookieStore = await cookies();
  if (!verifySession(cookieStore.get(sessionCookieName())?.value)) return <LoginGate />;

  const { configured, error, orders, materials, totals } = await getDashboardData();
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date());
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const destinations: Record<string, string> = {
    "Tổng quan": "/",
    "Đơn hàng": "/manage/orders",
    "Chi tiết đơn": "/manage/order_items",
    "Sản phẩm": "/manage/products",
    "Cấu hình in": "/manage/print_profiles",
    "Máy in": "/manage/machines",
    "Sản xuất": "/manage/production_batches",
    "Kho vật liệu": "/manage/materials",
    "Giao dịch kho": "/manage/inventory_transactions",
    "Kênh bán": "/manage/sales_channels",
    "Cấu hình chung": "/manage/settings",
    "Chi phí": "/manage/expenses",
    "Báo cáo": "/manage/reports",
  };

  const navGroups = [
    {
      label: "TỔNG QUAN",
      items: [{ name: "Tổng quan", icon: LayoutDashboard }],
    },
    {
      label: "VẬN HÀNH & SẢN XUẤT",
      items: [
        { name: "Đơn hàng", icon: ShoppingBag, count: totals.pendingOrders > 0 ? String(totals.pendingOrders) : undefined },
        { name: "Chi tiết đơn", icon: ListOrdered },
        { name: "Sản phẩm", icon: Box },
        { name: "Cấu hình in", icon: SlidersHorizontal },
        { name: "Máy in", icon: Printer },
        { name: "Sản xuất", icon: Cpu },
        { name: "Kho vật liệu", icon: PackageCheck, alert: materials.some((item) => item.quantity <= item.low_stock_threshold) },
        { name: "Giao dịch kho", icon: ArrowLeftRight },
      ],
    },
    {
      label: "TÀI CHÍNH & BÁO CÁO",
      items: [
        { name: "Kênh bán", icon: Store },
        { name: "Cấu hình chung", icon: Settings },
        { name: "Chi phí", icon: Receipt },
        { name: "Báo cáo", icon: BarChart3 },
      ],
    },
  ];

  const profitMargin = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100) : 0;
  const lowStockCount = materials.filter((item) => item.quantity <= item.low_stock_threshold).length;

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="B3D Lab Trang chủ">
          <div className="brand-mark">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div className="brand-copy">
            <strong>B3D Lab</strong>
            <small>PRINT STUDIO</small>
          </div>
        </Link>

        <div className="workspace-switch">
          <div className="workspace-avatar">B</div>
          <div className="workspace-info">
            <strong>B3D Studio</strong>
            <small>
              <span className="status-dot-active" /> Xưởng in hoạt động
            </small>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>

        <nav className="side-nav" aria-label="Điều hướng chính">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isSelected = item.name === "Tổng quan";
                return (
                  <Link
                    key={item.name}
                    className={`nav-item ${isSelected ? "selected" : ""}`}
                    href={destinations[item.name] ?? "#"}
                  >
                    <span className="nav-icon">
                      <IconComponent className="w-4 h-4" />
                    </span>
                    <span>{item.name}</span>
                    {item.count && <span className="nav-count">{item.count}</span>}
                    {item.alert && <span className="nav-alert-dot" title="Có vật liệu sắp hết" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-card-header">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Hướng dẫn & Thiết lập</span>
            </div>
            <p>Tùy chỉnh thông số điện, chi phí công và bảng giá kênh bán.</p>
            <Link href="/manage/settings">
              <span>Cấu hình chung</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="profile-card">
            <div className="profile-avatar">AD</div>
            <div className="profile-info">
              <strong>Admin B3D</strong>
              <small>Quản trị xưởng in</small>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="breadcrumbs">
            <span>B3D Lab</span>
            <span>/</span>
            <strong>Tổng quan</strong>
          </div>

          <div className="top-actions">
            <div className="date-badge">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{today}</span>
            </div>
            <div className="top-divider" />
            <ExcelImport />
          </div>
        </header>

        {/* CONTENT WRAPPER */}
        <div className="content-wrap">
          {/* WELCOME ROW */}
          <section className="welcome-row">
            <div className="welcome-info">
              <div className="eyebrow">
                <span className="eyebrow-dot" /> BẢNG ĐIỀU KHIỂN XƯỞNG IN
              </div>
              <h1>Tổng quan hoạt động sản xuất</h1>
              <p className="welcome-sub">
                Theo dõi số liệu thực tế, tiến độ đơn hàng và lượng nhựa tiêu thụ trong xưởng.
              </p>
            </div>

            <div className="welcome-actions">
              <Link className="primary-button" href="/manage/orders">
                <ShoppingBag className="w-4 h-4" />
                <span>Quản lý đơn hàng</span>
              </Link>
            </div>
          </section>

          {/* CONNECTION NOTICE IF ANY */}
          {error && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">
                  {configured ? "Lỗi truy vấn cơ sở dữ liệu Supabase" : "Chưa kết nối Supabase"}
                </strong>
                <p className="mt-1 text-xs text-amber-700 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* 4 STATS METRICS CARDS */}
          <section className="stats-grid" aria-label="Chỉ số vận hành">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-title">Doanh thu tháng này</span>
                <div className="stat-icon emerald">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="stat-value">{currency.format(totals.revenue)}</div>
              <div className="stat-foot">
                <span>{monthLabel}</span>
                <span className="trend-badge green">
                  <CheckCircle2 className="w-3 h-3" /> Hoạt động
                </span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-title">Lợi nhuận gộp theo đơn</span>
                <div className="stat-icon indigo">
                  <CircleDollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="stat-value">{currency.format(totals.profit)}</div>
              <div className="stat-foot">
                <span>{totals.revenue > 0 ? `Biên lợi nhuận ${profitMargin}%` : "Chưa phát sinh chi phí"}</span>
                {totals.revenue > 0 && <span className="trend-badge blue">{profitMargin}%</span>}
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-title">Đơn hàng cần xử lý</span>
                <div className="stat-icon amber">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="stat-value">
                {number.format(totals.pendingOrders)}
                <span className="stat-unit">đơn hàng</span>
              </div>
              <div className="stat-foot">
                <span>Đang chờ in, đóng gói hoặc giao</span>
                {totals.pendingOrders > 0 && (
                  <span className="text-amber-600 font-semibold text-xs">{totals.pendingOrders} đơn chờ</span>
                )}
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-title">Vật liệu & Tồn kho</span>
                <div className="stat-icon cyan">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>
              <div className="stat-value">
                {number.format(totals.inventoryUnits)}
                <span className="stat-unit">gam / đơn vị</span>
              </div>
              <div className="stat-foot">
                <span>{materials.length} cuộn vật liệu theo dõi</span>
                {lowStockCount > 0 ? (
                  <span className="text-red-500 font-semibold text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {lowStockCount} sắp hết
                  </span>
                ) : (
                  <span className="trend-badge green">Đầy đủ</span>
                )}
              </div>
            </article>
          </section>

          {/* RECENT ACTIVITY */}
          <section className="middle-grid">
            {/* PANEL: RECENT ACTIVITY */}
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Hoạt động gần đây</h2>
                  <p>Nhật ký đơn hàng và sản xuất mới nhất</p>
                </div>
                <Link className="text-link" href="/manage/orders">
                  <span>Xem tất cả</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 4).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {order.channel.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">
                            Đơn hàng <span className="font-mono text-indigo-600">{order.order_number}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Intl.DateTimeFormat("vi-VN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(order.ordered_at))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm text-slate-900">{currency.format(order.total_amount)}</div>
                        <span className={`status-pill ${order.status === "completed" ? "status-completed" : "status-pending"}`}>
                          <span className="pulse-dot" />
                          {order.status === "completed" ? "Hoàn thành" : "Chờ xử lý"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-box">
                  <div className="empty-icon-circle">
                    <ArrowUpRight className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3>Chưa có hoạt động trong tháng này</h3>
                  <p>Các đơn hàng mới hoặc lịch in sẽ được tự động hiển thị tại đây khi có dữ liệu.</p>
                </div>
              )}
            </article>

          </section>

          {/* BOTTOM GRID: ORDERS TABLE & MATERIALS INVENTORY */}
          <section className="bottom-grid">
            {/* ORDERS TABLE */}
            <article className="panel" id="orders">
              <div className="panel-heading">
                <div>
                  <h2>
                    Đơn hàng gần đây
                    <span className="heading-badge">{orders.length}</span>
                  </h2>
                  <p>Danh sách các đơn hàng mới nhất trên hệ thống</p>
                </div>
                <Link className="text-link" href="/manage/orders">
                  <span>Xem chi tiết</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {orders.length > 0 ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>MÃ ĐƠN</th>
                        <th>KÊNH BÁN</th>
                        <th>NGÀY ĐẶT</th>
                        <th>TỔNG TIỀN</th>
                        <th>TRẠNG THÁI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => {
                        const channelLower = (order.channel || "").toLowerCase();
                        let channelClass = "channel-direct";
                        if (channelLower.includes("shopee")) channelClass = "channel-shopee";
                        else if (channelLower.includes("tiktok")) channelClass = "channel-tiktok";
                        else if (channelLower.includes("lazada")) channelClass = "channel-lazada";

                        return (
                          <tr key={order.id}>
                            <td>
                              <span className="order-code">{order.order_number}</span>
                            </td>
                            <td>
                              <span className={`channel-pill ${channelClass}`}>{order.channel}</span>
                            </td>
                            <td className="text-slate-500 text-xs">
                              {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(
                                new Date(order.ordered_at)
                              )}
                            </td>
                            <td className="font-semibold text-slate-900 font-mono text-sm">
                              {currency.format(order.total_amount)}
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  order.status === "completed"
                                    ? "status-completed"
                                    : order.status === "cancelled"
                                    ? "status-cancelled"
                                    : "status-pending"
                                }`}
                              >
                                <span className="pulse-dot" />
                                {order.status === "completed"
                                  ? "Đã giao"
                                  : order.status === "cancelled"
                                  ? "Đã hủy"
                                  : "Chờ xử lý"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state-box">
                  <div className="empty-icon-circle">
                    <ShoppingBag className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3>Chưa có đơn hàng nào</h3>
                  <p>Hãy bấm &quot;Nhập Excel&quot; hoặc thêm đơn hàng đầu tiên trong mục Quản lý đơn.</p>
                </div>
              )}
            </article>

            {/* MATERIALS INVENTORY */}
            <article className="panel" id="materials">
              <div className="panel-heading">
                <div>
                  <h2>
                    Kho vật liệu
                    {lowStockCount > 0 && <span className="heading-badge warn">{lowStockCount} sắp hết</span>}
                  </h2>
                  <p>Theo dõi tồn lượng nhựa in 3D</p>
                </div>
                <Link className="text-link" href="/manage/materials">
                  <span>Kho vật tư</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              {materials.length > 0 ? (
                <div className="material-list">
                  {materials.map((material) => {
                    const isLow = material.quantity <= material.low_stock_threshold;
                    const percent = Math.min(
                      100,
                      material.low_stock_threshold
                        ? Math.round((material.quantity / (material.low_stock_threshold * 3)) * 100)
                        : 100
                    );

                    return (
                      <div className="material-card" key={material.id}>
                        <div className={`material-spool-icon ${isLow ? "low" : ""}`}>
                          <PackageCheck className="w-5 h-5" />
                        </div>
                        <div className="material-info">
                          <div className="material-title-row">
                            <strong>{material.name}</strong>
                            <span>{material.brand ?? "Filament"}</span>
                          </div>
                          <div className="material-progress-track">
                            <div
                              className={`material-progress-bar ${isLow ? "low" : ""}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        <div className="material-weight">
                          <strong>{number.format(material.quantity)} g</strong>
                          <small className={isLow ? "text-red-500 font-semibold" : "text-slate-400"}>
                            {isLow ? "Sắp hết" : "Đủ dùng"}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-box">
                  <div className="empty-icon-circle">
                    <PackageCheck className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h3>Chưa có vật liệu trong kho</h3>
                  <p>Thêm danh sách cuộn nhựa PLA, PETG, TPU để theo dõi trọng lượng tự động.</p>
                </div>
              )}
            </article>
          </section>

          {/* PAGE FOOTER */}
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} B3D Lab · Print Studio</span>
            <div className="flex items-center gap-2">
              <span className={`status-dot-active ${configured ? "" : "!bg-amber-500"}`} />
              <span>{configured ? "Kết nối Supabase trực tiếp (REST v1)" : "Chưa cấu hình Supabase"}</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
