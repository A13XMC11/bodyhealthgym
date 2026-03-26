-- Create attendance table
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  fecha date not null default current_date,
  hora time not null default current_time,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.attendance enable row level security;

-- Create policies
create policy "Admins full access attendance" on public.attendance
  for all using (auth.role() = 'authenticated');

-- Create indexes for performance
create index attendance_client_fecha_idx on public.attendance (client_id, fecha);
create index attendance_fecha_idx on public.attendance (fecha);
