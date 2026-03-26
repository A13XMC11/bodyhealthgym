# 📧 Setup - Formulario de Contacto

## Paso 1: Crear tabla en Supabase

El formulario de contacto necesita la tabla `contact_messages` en Supabase.

### Opción A: Ejecutar SQL (Recomendado)

1. Ve a tu proyecto en [Supabase](https://supabase.com/dashboard)
2. Abre **SQL Editor** → **New Query**
3. Copia todo el contenido de `supabase/contact_schema.sql`
4. Pega en el editor
5. Haz clic en **RUN** (botón azul)

El schema crea:
- Tabla `contact_messages` con campos: id, nombre, email, mensaje, created_at
- Índices para performance
- RLS policies: público puede enviar, solo autenticados pueden ver

---

### Opción B: Manual (si prefieres)

1. Ve a **SQL Editor** → **New Query**
2. Ejecuta este código:

```sql
create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  nombre varchar(255) not null,
  email varchar(255) not null,
  mensaje text not null,
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit contact messages" on public.contact_messages
  for insert with check (true);

create policy "Authenticated users can view contact messages" on public.contact_messages
  for select using (auth.role() = 'authenticated');

create index contact_messages_email_idx on public.contact_messages (email);
create index contact_messages_created_at_idx on public.contact_messages (created_at);
```

---

## Paso 2: Verificar tabla creada

1. Ve a **Table Editor**
2. Deberías ver `contact_messages` en la lista
3. Abre la tabla y verifica que tenga 4 columnas:
   - `id` (uuid)
   - `nombre` (varchar)
   - `email` (varchar)
   - `mensaje` (text)
   - `created_at` (timestamptz)

---

## Funcionalidades del Formulario

✅ **Validaciones:**
- Nombre: mínimo 3 caracteres, no solo espacios
- Email: formato válido (@ + dominio), sin espacios
- Mensaje: mínimo 10 caracteres, no solo espacios
- Errores mostrados en rojo debajo de cada campo
- Botón deshabilitado mientras hay errores

✅ **Envío:**
- Se conecta a Supabase `contact_messages`
- Deshabilita botón mientras procesa
- Spinner mientras envía

✅ **Confirmación:**
- ✅ Toast verde: "Mensaje enviado correctamente"
- ❌ Toast rojo: "Error al enviar, intenta de nuevo"
- Limpia campos después de enviar

---

## Prueba el formulario

1. Ve a la landing page
2. Desplázate a sección "CONTACTO"
3. Intenta enviar sin llenar: verás errores en rojo
4. Llena con datos válidos y envía
5. Deberías ver: ✅ Toast verde + campos limpios

---

## Ver mensajes en Supabase

1. Ve a **Table Editor** → `contact_messages`
2. Cada mensaje aparecerá con:
   - Nombre
   - Email
   - Mensaje
   - Fecha/hora (created_at)

---

## Variables de entorno

El formulario usa las variables de Supabase del archivo `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No necesita configuración adicional.
