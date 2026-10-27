-- B3D Lab: schema MVP cho dashboard quản lý xưởng in 3D.
create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  channel text not null default 'Shopee',
  ordered_at timestamptz not null default now(),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  profit numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','confirmed','printing','packing','shipped','completed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  material_type text not null default 'PLA',
  color text,
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  low_stock_threshold numeric(12,2) not null default 200 check (low_stock_threshold >= 0),
  cost_per_gram numeric(12,4) not null default 0 check (cost_per_gram >= 0),
  created_at timestamptz not null default now()
);

-- Enables safe upsert by material name during Excel import (for existing projects too).
create unique index if not exists materials_name_unique_idx on public.materials (name);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  description text,
  material_id uuid references public.materials(id) on delete set null,
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now()
);

-- Dashboard now reads through server-only routes after app-password login.
alter table public.orders enable row level security;
alter table public.materials enable row level security;
alter table public.products enable row level security;

drop policy if exists "anon reads orders" on public.orders;
drop policy if exists "anon reads materials" on public.materials;
drop policy if exists "anon reads products" on public.products;
revoke all on public.orders, public.materials, public.products from anon, authenticated;
grant all on public.orders, public.materials, public.products to service_role;

-- Workbook replacement tables (no sample business rows are inserted).
create table if not exists public.settings (
  setting_key text primary key,
  setting_value numeric not null,
  unit text,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists category text;
alter table public.products add column if not exists variant text;
alter table public.products add column if not exists main_material_code text;
alter table public.products add column if not exists print_profile_code text;
alter table public.products add column if not exists reference_price numeric(14,2);
alter table public.products add column if not exists status text not null default 'active';
alter table public.materials add column if not exists code text;
alter table public.materials add column if not exists purchase_price numeric(14,2) not null default 0;
alter table public.materials add column if not exists mass_grams numeric(12,2) not null default 1000;
alter table public.materials add column if not exists opening_stock numeric(12,2) not null default 0;
alter table public.materials add column if not exists unit text not null default 'g';
alter table public.materials add column if not exists description text;
alter table public.orders add column if not exists channel_code text;
alter table public.orders add column if not exists external_order_number text;
alter table public.orders add column if not exists shipping_cost numeric(14,2) not null default 0;
alter table public.orders add column if not exists seller_discount numeric(14,2) not null default 0;
alter table public.orders add column if not exists refund_amount numeric(14,2) not null default 0;

create unique index if not exists materials_code_unique_idx on public.materials (code);

create table if not exists public.machines (
  code text primary key,
  name text not null,
  purchase_price numeric(14,2) not null default 0,
  expected_hours numeric(12,2) not null default 1,
  depreciation_per_hour numeric(12,2) not null default 0,
  maintenance_per_hour numeric(12,2) not null default 0,
  average_power_kw numeric(8,4) not null default 0,
  notes text
);

create table if not exists public.print_profiles (
  code text primary key,
  sku text references public.products(sku) on update cascade on delete set null,
  name text not null,
  machine_code text references public.machines(code) on update cascade on delete set null,
  material_code text references public.materials(code) on update cascade on delete set null,
  filament_per_run_g numeric(12,2) not null default 0,
  units_per_run numeric(10,2) not null default 1,
  print_hours numeric(10,2) not null default 0,
  labor_minutes_per_unit numeric(10,2) not null default 0,
  design_minutes_total numeric(10,2) not null default 0,
  expected_sales_units numeric(12,2) not null default 1,
  defect_rate numeric(6,4) not null default 0,
  notes text
);

create table if not exists public.sales_channels (
  code text primary key,
  name text not null,
  fee_rate numeric(7,5) not null default 0,
  fixed_fee_per_order numeric(14,2) not null default 0,
  packaging_per_order numeric(14,2) not null default 0,
  notes text
);

create table if not exists public.order_items (
  line_code text primary key,
  order_number text not null references public.orders(order_number) on update cascade on delete cascade,
  sku text references public.products(sku) on update cascade on delete set null,
  quantity integer not null default 1,
  unit_price numeric(14,2) not null default 0,
  seller_discount numeric(14,2) not null default 0,
  unit_cost_snapshot numeric(14,2) not null default 0,
  channel_fee numeric(14,2) not null default 0,
  fixed_fee_allocated numeric(14,2) not null default 0,
  packaging_per_unit numeric(14,2) not null default 0,
  notes text
);

create table if not exists public.production_batches (
  code text primary key,
  produced_at date not null default current_date,
  profile_code text references public.print_profiles(code) on update cascade on delete set null,
  machine_code text references public.machines(code) on update cascade on delete set null,
  good_quantity integer not null default 0,
  failed_quantity integer not null default 0,
  actual_hours numeric(10,2) not null default 0,
  actual_filament_g numeric(12,2) not null default 0,
  machine_cost numeric(14,2) not null default 0,
  material_cost numeric(14,2) not null default 0,
  labor_cost numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  notes text
);

create table if not exists public.inventory_transactions (
  code text primary key,
  occurred_at date not null default current_date,
  item_type text not null,
  item_code text not null,
  unit text not null default 'unit',
  quantity_delta numeric(12,2) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0,
  reason text,
  linked_batch_or_order text
);

create table if not exists public.expenses (
  code text primary key,
  occurred_at date not null default current_date,
  category text not null,
  description text not null,
  amount numeric(14,2) not null default 0,
  allocated_sku text,
  allocated_order text references public.orders(order_number) on update cascade on delete set null,
  notes text
);

create or replace view public.profile_costing as
with assumptions as (
  select
    coalesce((select setting_value from public.settings where setting_key = 'GIA_DIEN_KWH'), 0) as electricity_rate,
    coalesce((select setting_value from public.settings where setting_key = 'DON_GIA_CON_GIO'), 0) as labor_rate
)
select p.code, p.sku, p.name,
  case when p.units_per_run * greatest(1 - p.defect_rate, 0.01) <= 0 then 0 else
    ((p.filament_per_run_g * coalesce(m.cost_per_gram, 0))
      + (p.print_hours * (coalesce(pr.depreciation_per_hour, 0) + coalesce(pr.maintenance_per_hour, 0)
        + coalesce(pr.average_power_kw, 0) * assumptions.electricity_rate))
      + (p.labor_minutes_per_unit * p.units_per_run / 60 * assumptions.labor_rate))
      / (p.units_per_run * greatest(1 - p.defect_rate, 0.01))
      + (p.design_minutes_total / 60 * assumptions.labor_rate / greatest(p.expected_sales_units, 1))
  end as estimated_unit_cost
from public.print_profiles p
cross join assumptions
left join public.materials m on m.code = p.material_code
left join public.machines pr on pr.code = p.machine_code;

create or replace view public.product_channel_pricing as
select pc.code as profile_code, pc.sku, pc.name, pc.estimated_unit_cost, sc.code as channel_code,
  case when 1 - sc.fee_rate - coalesce((select setting_value from public.settings where setting_key = 'BIEN_LOI_NHUAN_MUC_TIEU'), 0.25) <= 0 then null
    else (pc.estimated_unit_cost + sc.fixed_fee_per_order + sc.packaging_per_order)
      / (1 - sc.fee_rate - coalesce((select setting_value from public.settings where setting_key = 'BIEN_LOI_NHUAN_MUC_TIEU'), 0.25))
  end as target_sale_price
from public.profile_costing pc
cross join public.sales_channels sc;

create or replace function public.refresh_order_totals() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  affected_order text;
begin
  affected_order := coalesce(new.order_number, old.order_number);
  update public.orders o set
    total_amount = greatest(0, coalesce((select sum(i.quantity * i.unit_price - i.seller_discount) from public.order_items i where i.order_number = affected_order), 0) - o.seller_discount - o.refund_amount),
    profit = coalesce((select sum(i.quantity * i.unit_price - i.seller_discount - i.channel_fee - i.fixed_fee_allocated - i.quantity * (i.packaging_per_unit + i.unit_cost_snapshot)) from public.order_items i where i.order_number = affected_order), 0) - o.shipping_cost - o.seller_discount - o.refund_amount
    where o.order_number = affected_order;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists order_items_refresh_totals on public.order_items;
create trigger order_items_refresh_totals after insert or update or delete on public.order_items
for each row execute function public.refresh_order_totals();

create or replace function public.refresh_order_totals_from_header() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.orders o set
    total_amount = greatest(0, coalesce((select sum(i.quantity * i.unit_price - i.seller_discount) from public.order_items i where i.order_number = new.order_number), 0) - new.seller_discount - new.refund_amount),
    profit = coalesce((select sum(i.quantity * i.unit_price - i.seller_discount - i.channel_fee - i.fixed_fee_allocated - i.quantity * (i.packaging_per_unit + i.unit_cost_snapshot)) from public.order_items i where i.order_number = new.order_number), 0) - new.shipping_cost - new.seller_discount - new.refund_amount
  where o.order_number = new.order_number;
  return new;
end;
$$;

drop trigger if exists orders_refresh_totals on public.orders;
create trigger orders_refresh_totals after update of shipping_cost, seller_discount, refund_amount on public.orders
for each row execute function public.refresh_order_totals_from_header();

create or replace function public.refresh_inventory_balance(p_item_type text, p_item_code text) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_item_type = 'Vật liệu' then
    update public.materials m set quantity = coalesce((select sum(t.quantity_delta) from public.inventory_transactions t where t.item_type = p_item_type and t.item_code = p_item_code), m.opening_stock)
    where m.code = p_item_code;
  elsif p_item_type = 'Thành phẩm' then
    update public.products p set stock_quantity = greatest(0, coalesce((select sum(t.quantity_delta) from public.inventory_transactions t where t.item_type = p_item_type and t.item_code = p_item_code), 0))::integer
    where p.sku = p_item_code;
  end if;
end;
$$;

create or replace function public.apply_inventory_transaction() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    perform public.refresh_inventory_balance(old.item_type, old.item_code);
  end if;
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    perform public.refresh_inventory_balance(new.item_type, new.item_code);
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists inventory_transactions_apply_balance on public.inventory_transactions;
create trigger inventory_transactions_apply_balance after insert or update or delete on public.inventory_transactions
for each row execute function public.apply_inventory_transaction();

-- Keep workbook modules private-by-default for signed-in users in later Auth setup.
-- Existing dashboard MVP policies are left unchanged for backward compatibility.

-- New workbook tables are accessed through server-only API routes using the secret key.
alter table public.settings enable row level security;
alter table public.machines enable row level security;
alter table public.print_profiles enable row level security;
alter table public.sales_channels enable row level security;
alter table public.order_items enable row level security;
alter table public.production_batches enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.expenses enable row level security;

grant all on public.settings, public.machines, public.print_profiles, public.sales_channels,
  public.order_items, public.production_batches, public.inventory_transactions, public.expenses to service_role;
grant select on public.profile_costing, public.product_channel_pricing to service_role;

create or replace function public.calculate_production_batch_costs() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_depreciation numeric := 0;
  v_maintenance numeric := 0;
  v_power numeric := 0;
  v_cost_per_gram numeric := 0;
  v_labor_minutes numeric := 0;
  v_electricity_rate numeric := 0;
  v_labor_rate numeric := 0;
begin
  select coalesce(m.depreciation_per_hour, 0), coalesce(m.maintenance_per_hour, 0), coalesce(m.average_power_kw, 0)
  into v_depreciation, v_maintenance, v_power from public.machines m where m.code = new.machine_code;
  select coalesce(mat.cost_per_gram, 0), coalesce(p.labor_minutes_per_unit, 0)
  into v_cost_per_gram, v_labor_minutes from public.print_profiles p left join public.materials mat on mat.code = p.material_code where p.code = new.profile_code;
  select coalesce(setting_value, 0) into v_electricity_rate from public.settings where setting_key = 'GIA_DIEN_KWH';
  select coalesce(setting_value, 0) into v_labor_rate from public.settings where setting_key = 'DON_GIA_CON_GIO';
  v_depreciation := coalesce(v_depreciation, 0);
  v_maintenance := coalesce(v_maintenance, 0);
  v_power := coalesce(v_power, 0);
  v_cost_per_gram := coalesce(v_cost_per_gram, 0);
  v_labor_minutes := coalesce(v_labor_minutes, 0);
  v_electricity_rate := coalesce(v_electricity_rate, 0);
  v_labor_rate := coalesce(v_labor_rate, 0);
  if coalesce(new.machine_cost, 0) = 0 then new.machine_cost := new.actual_hours * (v_depreciation + v_maintenance + v_power * v_electricity_rate); end if;
  if coalesce(new.material_cost, 0) = 0 then new.material_cost := new.actual_filament_g * v_cost_per_gram; end if;
  if coalesce(new.labor_cost, 0) = 0 then new.labor_cost := v_labor_minutes * new.good_quantity / 60 * v_labor_rate; end if;
  if coalesce(new.total_cost, 0) = 0 then new.total_cost := new.machine_cost + new.material_cost + new.labor_cost; end if;
  return new;
end;
$$;

drop trigger if exists production_batches_calculate_costs on public.production_batches;
create trigger production_batches_calculate_costs before insert or update on public.production_batches
for each row execute function public.calculate_production_batch_costs();

revoke all on function public.refresh_order_totals() from public, anon, authenticated;
revoke all on function public.refresh_order_totals_from_header() from public, anon, authenticated;
revoke all on function public.refresh_inventory_balance(text, text) from public, anon, authenticated;
revoke all on function public.apply_inventory_transaction() from public, anon, authenticated;
revoke all on function public.calculate_production_batch_costs() from public, anon, authenticated;

create or replace function public.calculate_order_item_costs() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_unit_cost numeric := 0;
  v_fee_rate numeric := 0;
  v_fixed_fee numeric := 0;
  v_packaging numeric := 0;
  v_order_channel text;
  v_line_count numeric := 1;
begin
  select coalesce(p.estimated_unit_cost, 0) into v_unit_cost from public.profile_costing p where p.sku = new.sku limit 1;
  select o.channel_code into v_order_channel from public.orders o where o.order_number = new.order_number;
  select coalesce(c.fee_rate, 0), coalesce(c.fixed_fee_per_order, 0), coalesce(c.packaging_per_order, 0)
    into v_fee_rate, v_fixed_fee, v_packaging from public.sales_channels c where c.code = v_order_channel;
  select count(*) + 1 into v_line_count from public.order_items i where i.order_number = new.order_number and i.line_code <> new.line_code;
  v_unit_cost := coalesce(v_unit_cost, 0);
  v_fee_rate := coalesce(v_fee_rate, 0);
  v_fixed_fee := coalesce(v_fixed_fee, 0);
  v_packaging := coalesce(v_packaging, 0);
  if coalesce(new.unit_cost_snapshot, 0) = 0 then new.unit_cost_snapshot := v_unit_cost; end if;
  if coalesce(new.channel_fee, 0) = 0 then new.channel_fee := greatest(0, new.quantity * new.unit_price - new.seller_discount) * v_fee_rate; end if;
  if coalesce(new.fixed_fee_allocated, 0) = 0 then new.fixed_fee_allocated := v_fixed_fee / greatest(v_line_count, 1); end if;
  if coalesce(new.packaging_per_unit, 0) = 0 then new.packaging_per_unit := v_packaging / greatest(new.quantity, 1); end if;
  return new;
end;
$$;

drop trigger if exists order_items_calculate_costs on public.order_items;
create trigger order_items_calculate_costs before insert or update on public.order_items
for each row execute function public.calculate_order_item_costs();
revoke all on function public.calculate_order_item_costs() from public, anon, authenticated;
