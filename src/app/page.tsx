import { getDashboardData } from "@/lib/dashboard";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("vi-VN");

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    search: "M11 19a8 8 0 1 1 5.66-2.34L21 21m-5-5 5 5", bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4", plus: "M12 5v14m-7-7h14", arrow: "M5 12h14m-7-7 7 7-7 7", down: "m7 10 5 5 5-5", printer: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2m-12-4h12v8H6z", dots: "M5 12h.01M12 12h.01M19 12h.01",
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? "M5 12h14"} /></svg>;
}

export default async function Home() {
  const { configured, error, orders, materials, totals } = await getDashboardData();
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(new Date());
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const navGroups = [
    { label: "TỔNG QUAN", items: [{ icon: "⌂", name: "Tổng quan", active: true }] },
    { label: "VẬN HÀNH", items: [{ icon: "▧", name: "Đơn hàng", count: String(totals.pendingOrders) }, { icon: "◇", name: "Sản phẩm" }, { icon: "◉", name: "Sản xuất" }, { icon: "▤", name: "Kho vật liệu", alert: materials.some((item) => item.quantity <= item.low_stock_threshold) }] },
    { label: "TÀI CHÍNH", items: [{ icon: "◈", name: "Tính giá thành" }, { icon: "↗", name: "Báo cáo" }] },
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="B3D Lab, trang chủ"><span className="brand-mark"><span/><span/><span/></span><span className="brand-copy"><strong>B3D Lab</strong><small>PRINT STUDIO</small></span></a>
      <button className="workspace-switch"><span className="workspace-avatar">B</span><span><strong>B3D Lab</strong><small>Xưởng in 3D</small></span><Icon name="down"/></button>
      <nav className="side-nav" aria-label="Điều hướng chính">{navGroups.map((group) => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map((item) => <a key={item.name} className={`nav-item ${"active" in item && item.active ? "selected" : ""}`} href="#"><span className="nav-icon">{item.icon}</span><span>{item.name}</span>{"count" in item && Number(item.count) > 0 && <span className="nav-count">{item.count}</span>}{"alert" in item && item.alert && <i className="nav-alert"/>}</a>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Cần một chút trợ giúp?</strong><p>Xem hướng dẫn để bắt đầu quản lý xưởng.</p><a href="#">Khám phá hướng dẫn <span>↗</span></a></div><a className="nav-item settings-link" href="#"><span className="nav-icon">⚙</span><span>Cài đặt</span></a><div className="profile"><span className="profile-avatar">B</span><span><strong>B3D Lab</strong><small>Quản trị viên</small></span><span className="profile-more">···</span></div></div>
    </aside>
    <main className="main-area" id="top">
      <header className="topbar"><div className="breadcrumbs">B3D Lab <span>/</span> <strong>Tổng quan</strong></div><div className="top-actions"><button className="icon-button search-button" aria-label="Tìm kiếm"><Icon name="search"/></button><button className="icon-button notification-button" aria-label="Thông báo"><Icon name="bell"/></button><span className="top-divider"/><div className="today-label"><span className="today-dot"/> {today}</div></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span/> BẢNG ĐIỀU KHIỂN</div><h1>Tổng quan xưởng in <span className="wave">✳</span></h1><p className="welcome-sub">Số liệu thực tế từ dữ liệu B3D Lab.</p></div><a className="primary-button" href="#orders"><Icon name="plus"/> Xem đơn hàng</a></section>
        {error && <div className="connection-notice" role="status"><strong>{configured ? "Chưa đọc được dữ liệu Supabase" : "Kết nối Supabase để bắt đầu"}</strong><span>{error}</span></div>}
        <section className="stats-grid" aria-label="Chỉ số kinh doanh">
          <article className="stat-card"><div className="stat-top"><span>Doanh thu tháng này</span><span className="stat-icon lavender">↗</span></div><div className="stat-value">{currency.format(totals.revenue)}</div><div className="stat-foot"><span>{monthLabel}</span></div></article>
          <article className="stat-card"><div className="stat-top"><span>Lợi nhuận gộp tháng này</span><span className="stat-icon mint">⌁</span></div><div className="stat-value">{currency.format(totals.profit)}</div><div className="stat-foot"><span>{totals.revenue ? `Biên lợi nhuận ${number.format(Math.round(totals.profit / totals.revenue * 100))}%` : "Chưa có dữ liệu đơn hàng"}</span></div></article>
          <article className="stat-card"><div className="stat-top"><span>Đơn cần xử lý</span><span className="stat-icon peach">▧</span></div><div className="stat-value">{number.format(totals.pendingOrders)}<span className="stat-unit">đơn hàng</span></div><div className="stat-foot"><span>Đang chờ xác nhận hoặc hoàn tất</span></div></article>
          <article className="stat-card"><div className="stat-top"><span>Sản phẩm trong kho</span><span className="stat-icon sky"><Icon name="printer"/></span></div><div className="stat-value">{number.format(totals.inventoryUnits)}<span className="stat-unit">sản phẩm</span></div><div className="stat-foot"><span>{number.format(materials.length)} loại vật liệu đang theo dõi</span></div></article>
        </section>
        <section className="middle-grid">
          <article className="panel revenue-panel"><div className="panel-heading"><div><h2>Hoạt động gần đây</h2><p>Đơn hàng mới nhất từ cơ sở dữ liệu</p></div><span className="select-button">Tháng này</span></div><div className="empty-activity"><span className="empty-icon">↗</span><strong>{configured ? "Chưa có hoạt động trong tháng này" : "Chưa có dữ liệu để hiển thị"}</strong><p>{configured ? "Các đơn hàng mới sẽ xuất hiện ở đây." : "Thêm cấu hình Supabase để dashboard đọc dữ liệu của bạn."}</p></div></article>
          <article className="panel printer-panel"><div className="panel-heading"><div><h2>Thiết bị sản xuất</h2><p>Máy in đã khai báo trong hệ thống</p></div><button className="more-button" aria-label="Thêm tùy chọn"><Icon name="dots"/></button></div><div className="printer-empty"><div className="printer-visual"><div className="printer-light"/><div className="printer-top-line"/><div className="printer-door"><span className="door-reflection"/></div><div className="printer-base"><span/><span/><span/></div></div><div><strong>Bambu Lab P1S</strong><p>Thêm máy in vào mục <a href="#">Thiết bị</a> để theo dõi sản xuất.</p><span className="offline-status"><i/> Chưa kết nối</span></div></div><div className="printer-footer"><span>Trạng thái dựa trên dữ liệu đã lưu</span></div></article>
        </section>
        <section className="bottom-grid"><article className="panel orders-panel" id="orders"><div className="panel-heading"><div><h2>Đơn hàng gần đây <span className="heading-count">{orders.length}</span></h2><p>Đơn hàng được lưu trong Supabase</p></div><a className="text-link" href="#orders">Tải lại trang <Icon name="arrow"/></a></div>{orders.length ? <div className="table-scroll"><table><thead><tr><th>MÃ ĐƠN</th><th>KÊNH BÁN</th><th>NGÀY ĐẶT</th><th>GIÁ TRỊ</th><th>TRẠNG THÁI</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="order-id">{order.order_number}</td><td className="product-cell">{order.channel}</td><td>{new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short" }).format(new Date(order.ordered_at))}</td><td className="amount-cell">{currency.format(order.total_amount)}</td><td><span className={`status ${order.status === "completed" ? "green" : order.status === "cancelled" ? "gray" : "amber"}`}><i/>{order.status}</span></td></tr>)}</tbody></table></div> : <div className="compact-empty">{configured ? "Chưa có đơn hàng. Hãy thêm đơn đầu tiên vào bảng orders." : "Kết nối Supabase để xem đơn hàng của B3D Lab."}</div>}</article>
          <article className="panel materials-panel"><div className="panel-heading"><div><h2>Kho vật liệu <span className="warning-count">{materials.filter((item) => item.quantity <= item.low_stock_threshold).length}</span></h2><p>Tồn kho được đọc trực tiếp từ Supabase</p></div><a className="text-link" href="#materials">Vật liệu <Icon name="arrow"/></a></div>{materials.length ? <div className="material-list" id="materials">{materials.map((material) => <div className="material-row" key={material.id}><span className={`spool-icon ${material.quantity <= material.low_stock_threshold ? "pink" : "green"}`}><i/></span><div className="material-detail"><div className="material-title"><strong>{material.name}</strong><span>{material.brand ?? "Vật liệu"}</span></div><div className="material-progress"><span className={material.quantity <= material.low_stock_threshold ? "pink" : "green"} style={{ width: `${Math.min(100, material.low_stock_threshold ? material.quantity / (material.low_stock_threshold * 3) * 100 : 100)}%` }}/></div></div><div className="material-amount"><strong>{number.format(material.quantity)} g</strong><span>{material.quantity <= material.low_stock_threshold ? "sắp hết" : "còn lại"}</span></div></div>)}</div> : <div className="compact-empty">{configured ? "Chưa có vật liệu trong kho." : "Kết nối Supabase để xem tồn kho."}</div>}</article></section>
        <footer className="page-footer"><span>© {new Date().getFullYear()} B3D Lab</span><span><i/> {configured ? "Dữ liệu tải trực tiếp từ Supabase" : "Chưa kết nối cơ sở dữ liệu"}</span><a href="#">Quản lý xưởng in 3D</a></footer>
      </div>
    </main>
  </div>;
}
