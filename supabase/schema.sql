-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients table
CREATE TABLE public.clients (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text UNIQUE NOT NULL,
  telefono text,
  fecha_inscripcion date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  foto_url text,
  created_at timestamptz DEFAULT NOW()
);

-- Promotions table
CREATE TABLE public.promotions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('2x1', 'porcentaje', 'precio_fijo', 'combo')),
  valor numeric(10,2) DEFAULT 0,
  descripcion text,
  activa boolean DEFAULT true,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('inscripcion', 'mensual', 'diario')),
  monto numeric(10,2) NOT NULL,
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  mes_correspondiente text,
  promocion_id uuid REFERENCES public.promotions(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz DEFAULT NOW()
);

-- Memberships table
CREATE TABLE public.memberships (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('mensual', 'diario')),
  fecha_inicio date NOT NULL,
  fecha_vencimiento date NOT NULL,
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada')),
  created_at timestamptz DEFAULT NOW()
);

-- Attendance table
CREATE TABLE public.attendance (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time NOT NULL DEFAULT CURRENT_TIME,
  hora_salida time,
  created_at timestamptz DEFAULT NOW()
);

-- Contact Messages table
CREATE TABLE public.contact_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  mensaje text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "Admins full access clients" ON public.clients
  FOR ALL USING (auth.role() = 'authenticated');

-- Payments policies
CREATE POLICY "Admins full access payments" ON public.payments
  FOR ALL USING (auth.role() = 'authenticated');

-- Memberships policies
CREATE POLICY "Admins full access memberships" ON public.memberships
  FOR ALL USING (auth.role() = 'authenticated');

-- Promotions policies
CREATE POLICY "Admins full access promotions" ON public.promotions
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Public can read active promotions" ON public.promotions
  FOR SELECT USING (activa = true);

-- Attendance policies
CREATE POLICY "Admins full access attendance" ON public.attendance
  FOR ALL USING (auth.role() = 'authenticated');

-- Contact Messages policies
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can view contact messages" ON public.contact_messages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX clients_email_idx ON public.clients(email);
CREATE INDEX clients_estado_idx ON public.clients(estado);
CREATE INDEX payments_client_id_idx ON public.payments(client_id);
CREATE INDEX payments_fecha_pago_idx ON public.payments(fecha_pago);
CREATE INDEX payments_mes_idx ON public.payments(mes_correspondiente);
CREATE INDEX memberships_client_id_idx ON public.memberships(client_id);
CREATE INDEX memberships_estado_idx ON public.memberships(estado);
CREATE INDEX memberships_vencimiento_idx ON public.memberships(fecha_vencimiento);
CREATE INDEX attendance_client_fecha_idx ON public.attendance(client_id, fecha);
CREATE INDEX attendance_fecha_idx ON public.attendance(fecha);
CREATE INDEX attendance_salida_idx ON public.attendance(client_id, fecha, hora_salida);
CREATE INDEX contact_messages_email_idx ON public.contact_messages(email);
CREATE INDEX contact_messages_created_at_idx ON public.contact_messages(created_at);
