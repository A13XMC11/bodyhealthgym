-- ============================================================================
-- Body Health Gym Database Schema
-- Consolidated schema with all tables, policies, and indexes
-- ============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

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

-- Attendance table
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  fecha date not null default current_date,
  hora time not null default current_time,
  hora_salida time,
  created_at timestamptz default now()
);

-- Contact Messages table
create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  nombre varchar(255) not null,
  email varchar(255) not null,
  mensaje text not null,
  created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.clients enable row level security;
alter table public.payments enable row level security;
alter table public.promotions enable row level security;
alter table public.memberships enable row level security;
alter table public.attendance enable row level security;
alter table public.contact_messages enable row level security;

-- ============================================================================
-- POLICIES
-- ============================================================================

-- Clients policies
create policy "Admins full access clients" on public.clients
  for all using (auth.role() = 'authenticated');

-- Payments policies
create policy "Admins full access payments" on public.payments
  for all using (auth.role() = 'authenticated');

-- Memberships policies
create policy "Admins full access memberships" on public.memberships
  for all using (auth.role() = 'authenticated');

-- Promotions policies
create policy "Admins full access promotions" on public.promotions
  for all using (auth.role() = 'authenticated');
create policy "Public can read active promotions" on public.promotions
  for select using (activa = true);

-- Attendance policies
create policy "Admins full access attendance" on public.attendance
  for all using (auth.role() = 'authenticated');

-- Contact Messages policies
create policy "Anyone can submit contact messages" on public.contact_messages
  for insert with check (true);
create policy "Authenticated users can view contact messages" on public.contact_messages
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================

-- Attendance indexes
create index attendance_client_fecha_idx on public.attendance (client_id, fecha);
create index attendance_fecha_idx on public.attendance (fecha);
create index attendance_salida_idx on public.attendance(client_id, fecha, hora_salida);

-- Contact Messages indexes
create index contact_messages_email_idx on public.contact_messages (email);
create index contact_messages_created_at_idx on public.contact_messages (created_at);
