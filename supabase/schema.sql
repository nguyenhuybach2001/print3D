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

-- MVP ban đầu dùng RLS với anon chỉ đọc. Không đưa service_role key vào ứng dụng.
alter table public.orders enable row level security;
alter table public.materials enable row level security;
alter table public.products enable row level security;

drop policy if exists "anon reads orders" on public.orders;
create policy "anon reads orders" on public.orders for select to anon using (true);
drop policy if exists "anon reads materials" on public.materials;
create policy "anon reads materials" on public.materials for select to anon using (true);
drop policy if exists "anon reads products" on public.products;
create policy "anon reads products" on public.products for select to anon using (true);

grant select on public.orders, public.materials, public.products to anon, authenticated;
