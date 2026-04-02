-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clients table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  apellido text not null,
  email text unique not null,
  telefono text,
  fecha_inscripcion date not null default current_date,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo')),
  foto_url text,
  created_at timestamptz default now()
);

-- Promotions table
create table public.promotions (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  tipo text not null check (tipo in ('2x1', 'porcentaje', 'precio_fijo', 'combo')),
  valor numeric(10,2) default 0,
  descripcion text,
  activa boolean default true,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz default now()
);

-- Payments table
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  tipo text not null check (tipo in ('inscripcion', 'mensual', 'diario')),
  monto numeric(10,2) not null,
  fecha_pago date not null default current_date,
  mes_correspondiente text,
  promocion_id uuid references public.promotions(id) on delete set null,
  notas text,
  created_at timestamptz default now()
);

-- Memberships table
create table public.memberships (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  tipo text not null check (tipo in ('mensual', 'diario')),
  fecha_inicio date not null,
  fecha_vencimiento date not null,
  estado text not null default 'activa' check (estado in ('activa', 'vencida', 'cancelada')),
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.clients enable row level security;
alter table public.payments enable row level security;
alter table public.promotions enable row level security;
alter table public.memberships enable row level security;

-- Policies: authenticated users (admins) have full access
create policy "Admins full access clients" on public.clients for all using (auth.role() = 'authenticated');
create policy "Admins full access payments" on public.payments for all using (auth.role() = 'authenticated');
create policy "Admins full access memberships" on public.memberships for all using (auth.role() = 'authenticated');
create policy "Admins full access promotions" on public.promotions for all using (auth.role() = 'authenticated');

-- Promotions: public read for landing page (active promotions)
create policy "Public can read active promotions" on public.promotions for select using (activa = true);
