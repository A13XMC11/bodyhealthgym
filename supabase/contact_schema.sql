-- Create contact_messages table
create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  nombre varchar(255) not null,
  email varchar(255) not null,
  mensaje text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.contact_messages enable row level security;

-- Create policy - anyone can insert (public form)
create policy "Anyone can submit contact messages" on public.contact_messages
  for insert with check (true);

-- Create policy - only authenticated users can view
create policy "Authenticated users can view contact messages" on public.contact_messages
  for select using (auth.role() = 'authenticated');

-- Create indexes for performance
create index contact_messages_email_idx on public.contact_messages (email);
create index contact_messages_created_at_idx on public.contact_messages (created_at);
