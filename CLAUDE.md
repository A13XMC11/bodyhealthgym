# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Body-Health-Gym** is a gym management application built with React and Supabase. It provides a public landing page and a protected admin dashboard for managing clients, payments, attendance, promotions, and generating reports.

**Tech Stack:**
- Frontend: React 19 + Vite with TailwindCSS
- Backend: Supabase (PostgreSQL + Auth + Real-time)
- Forms: React Hook Form
- Charts: Recharts
- Date handling: date-fns
- Icons: Lucide React
- PDF generation: jsPDF
- Phone validation: libphonenumber-js
- Deployment: Vercel

## Essential Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint (flat config in eslintrc.js)

# Single test or isolated work
npm run dev -- --port 3000    # Start on different port if needed
```

## Environment Setup

**Required environment variables** (in `.env`):
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

These are validated at runtime in `src/lib/supabase.js` and will throw an error if missing. For Vercel deployment, add these to project settings.

## Codebase Architecture

### Directory Structure

```
src/
├── contexts/
│   └── AuthContext.jsx          # Auth provider + useAuth hook
├── lib/
│   ├── supabase.js              # Supabase client initialization
│   └── dates.js                 # Date utility functions (locale-aware)
├── components/
│   ├── landing/                 # Public landing page components
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Servicios.jsx
│   │   ├── Precios.jsx
│   │   ├── Testimonios.jsx
│   │   ├── Contacto.jsx
│   │   ├── Promociones.jsx
│   │   └── Footer.jsx
│   └── admin/                   # Protected admin area components
│       ├── AdminLayout.jsx      # Main admin wrapper with Sidebar + Header
│       ├── Sidebar.jsx          # Navigation menu
│       └── AdminHeader.jsx      # Top header bar
├── pages/
│   ├── Landing.jsx              # Public landing page
│   ├── Login.jsx                # Authentication page
│   └── admin/                   # Protected admin pages
│       ├── Dashboard.jsx        # Metrics, charts, expiring memberships
│       ├── Clientes.jsx         # Client CRUD
│       ├── Pagos.jsx            # Payment tracking
│       ├── Asistencia.jsx       # Attendance tracking
│       ├── Promociones.jsx      # Promotion management
│       └── Reportes.jsx         # Report generation (PDF export)
├── App.jsx                      # Main routing setup
├── main.jsx                     # React DOM mount
└── index.css                    # Global styles + Tailwind directives
```

### Key Components & Patterns

**AuthContext** (`src/contexts/AuthContext.jsx`):
- Manages Supabase auth state (user, loading)
- Provides `signIn(email, password)` and `signOut()` methods
- Listens to auth state changes with `onAuthStateChange` subscription
- Use `const { user, loading, signIn, signOut } = useAuth()` in components

**PrivateRoute** (`src/components/PrivateRoute.jsx`):
- Wrapper that checks if user is authenticated
- Redirects to `/login` if not authenticated, shows loading state while checking

**Admin Layout** (`src/components/admin/AdminLayout.jsx`):
- Wraps all admin pages with Sidebar + Header
- Uses nested routes with `<Outlet />` from React Router

**Supabase Client** (`src/lib/supabase.js`):
- Singleton instance created on app load
- Validates `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at initialization
- Used throughout pages for database queries and auth operations

**Date Utilities** (`src/lib/dates.js`):
- `fechaHoy()` - Returns today's date in local timezone
- `parseFechaLocal(dateString)` - Parse date preserving local timezone
- `formatFechaISO(date)` - Format as ISO string
- `formatearFecha(date)` - Format date in Spanish locale
- `mesHoy()` - Get current month/year
- All functions use `date-fns` with Spanish locale (`es`)

### Data Model (Supabase Tables)

The app interacts with these Supabase tables:
- `clients` - Customer information (id, nombre, apellido, email, telefono, estado)
- `payments` - Payment records (id, client_id, monto, fecha_pago)
- `memberships` - Membership data (client_id, fecha_inicio, fecha_fin, estado)
- `attendance` - Attendance records (id, client_id, fecha, estado)
- `promotions` - Promotional offers

Data is fetched using Supabase JS client with RLS (Row-Level Security) policies. All queries use real-time subscriptions where needed.

### Routing Structure

```
/ (Landing)
  ├── /login (Login page)
  └── /admin/* (Protected routes, require authentication)
      ├── /admin (Dashboard with metrics & charts)
      ├── /admin/clientes (Client management)
      ├── /admin/pagos (Payment tracking)
      ├── /admin/asistencia (Attendance)
      ├── /admin/promociones (Promotions)
      └── /admin/reportes (PDF reports)
```

## Common Development Tasks

### Adding a New Page

1. Create page in `src/pages/admin/NewPage.jsx`
2. Import in `src/App.jsx` and add route:
   ```jsx
   import NewPage from './pages/admin/NewPage'
   // Inside Routes, inside the /admin PrivateRoute:
   <Route path="nuevo" element={<NewPage />} />
   ```
3. Add navigation link in `src/components/admin/Sidebar.jsx`

### Querying Supabase Data

```javascript
import { supabase } from '../../lib/supabase'

// Select
const { data, error } = await supabase
  .from('clients')
  .select('id, nombre, apellido, email')

// Insert
const { data, error } = await supabase
  .from('clients')
  .insert([{ nombre, apellido, email }])

// Update
const { data, error } = await supabase
  .from('clients')
  .update({ estado: 'activo' })
  .eq('id', clientId)

// Delete
const { error } = await supabase
  .from('clients')
  .delete()
  .eq('id', clientId)

// Real-time subscription
const subscription = supabase
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'clients' },
    (payload) => { /* handle changes */ }
  )
  .subscribe()
```

### Working with Forms

The app uses **React Hook Form** with Controller for custom components:

```jsx
import { useForm, Controller } from 'react-hook-form'

const { control, handleSubmit, watch } = useForm({
  defaultValues: { nombre: '', email: '' }
})

return (
  <form onSubmit={handleSubmit(async (data) => {
    const { error } = await supabase.from('clients').insert([data])
    if (error) toast.error(error.message)
  })}>
    <Controller
      name="nombre"
      control={control}
      rules={{ required: 'Name is required' }}
      render={({ field, fieldState: { error } }) => (
        <>
          <input {...field} />
          {error && <span>{error.message}</span>}
        </>
      )}
    />
  </form>
)
```

### Displaying Notifications

Use `react-hot-toast`:

```javascript
import toast from 'react-hot-toast'

toast.success('Payment recorded')
toast.error('Failed to update client')
toast.loading('Processing...')
```

Toaster is globally configured in `App.jsx` with dark theme and red accent color.

### Date Handling

Always use date-fns with Spanish locale for user-facing dates:

```javascript
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fechaHoy, parseFechaLocal, formatFechaISO } from '../../lib/dates'

// Get today's date (locale-aware)
const today = fechaHoy()

// Format for display
const display = format(date, 'dd MMMM yyyy', { locale: es })

// Store in ISO format for database
const iso = formatFechaISO(date)
```

### Charts & Visualizations

Use Recharts for charts:

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="mes" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="ingresos" fill="#dc2626" />
  </BarChart>
</ResponsiveContainer>
```

### PDF Export

Use jsPDF:

```javascript
import jsPDF from 'jspdf'

const pdf = new jsPDF()
pdf.text('Report Title', 10, 10)
pdf.text(`Generated: ${new Date().toLocaleDateString('es-ES')}`, 10, 20)
pdf.save('reporte.pdf')
```

## Code Style & Conventions

### Component Files
- Use `.jsx` extension (not `.js`)
- One component per file (unless small utility components)
- Name exports as default (`export default function ComponentName`)
- Extract custom hooks to separate files

### Naming
- Components: PascalCase (`Dashboard.jsx`, `UserCard.jsx`)
- Functions/hooks: camelCase (`fetchMetrics`, `useAuth`)
- Constants: UPPER_SNAKE_CASE
- CSS classes: Use Tailwind utilities (no custom CSS unless necessary)

### Styling
- Use TailwindCSS utility classes exclusively
- No CSS modules or styled-components
- Dark theme is primary (see `App.jsx` toast config)
- Red accent color: `#dc2626` (use `bg-red-600`, `text-red-600`)

### Error Handling
- Validate user input at form level with React Hook Form
- Check Supabase responses for errors
- Show user-friendly error messages with toast
- Log detailed errors server-side (not in client-facing code)

### No Hardcoded Values
- Extract magic numbers to variables with clear names
- Use environment variables for configuration
- Localize strings (Spanish/English as needed)

## Linting & Code Quality

**ESLint Configuration**: Flat config in `eslint.config.js`
- Checks: ES recommended rules, React Hooks plugin, React Refresh plugin
- Ignores: `dist/` folder
- Custom rule: Uppercase variable pattern (for components) ignored in unused vars check

**Run linting:**
```bash
npm run lint
```

Fix any linting issues before committing. The project does not use Prettier, so format manually or use ESLint auto-fix where safe.

## Deployment

**Target**: Vercel

**Pre-deployment checklist**:
1. Ensure all environment variables are set in Vercel project settings
2. Run `npm run build` locally to verify production build succeeds
3. Verify no `console.log` statements in production code
4. Check that authentication pages work on deployed URL
5. Test at least one protected page to verify auth flow

**Build output**: Static files in `dist/` folder (Vite default)

See `VERCEL_DEPLOYMENT_GUIDE.md` and `ENV_SETUP_VERCEL.md` for detailed setup.

## Important Gotchas & Notes

### Timezone Handling
- Supabase stores dates in UTC, but the app expects local timezone
- Use `parseFechaLocal()` when reading dates from the database to preserve timezone
- Use `formatFechaISO()` when storing dates to ensure consistency
- Many bugs occur from timezone mismatches in date comparisons

### Membership Expiration Logic
- Check `MEMBERSHIP_SYSTEM_FIX.md` for detailed notes on how expiration is calculated
- Membership expiration is compared against "today" using `parseFechaLocal(fechaHoy())`
- Filter logic: `fecha_fin < today` means expired

### Cobros Pendientes (Pending Charges)
`Pagos.jsx` shows a "Cobros pendientes" section at the top whenever clients are approaching renewal:
- **Window**: memberships with `fecha_vencimiento` between today − 5 days and today + 10 days
- **Yellow badge**: "Vence en Nd" — still active but within the 10-day renovation window
- **Red badge**: "Vencida hace Nd" — already expired (up to 5 days grace shown)
- **"Cobrar" button**: opens the payment modal pre-filled with the client and `tipo = mensual`
- **Auto-removes**: once a client pays, their `fecha_vencimiento` jumps +30 days and falls outside the window — no manual state needed
- The `bloqueoMensual` check in `verificarCliente` uses the same 10-day window, so the modal correctly allows renewal for clients shown here

### Phone Number Validation
- Uses libphonenumber-js to validate phone numbers
- Defaults to Ecuador (+593) for numbers without country code
- Normalizes formats: `09xxxxxxxxx` → `+593xxxxxxxxx`

### Contact Form
- Handled by `Contacto.jsx` component
- Currently uses Supabase or email integration (see `SETUP_CONTACT_FORM.md`)

### Security Notes
- Never hardcode Supabase keys (use environment variables)
- RLS policies on Supabase tables restrict data access by auth user
- Never expose full Supabase URL/key in client code (already done correctly)
- See `SECURITY.md` for comprehensive security guidelines

### Known Issues & Reference Docs
- `MEMBERSHIP_SYSTEM_FIX.md` - Detailed fix for membership expiration display
- `ENV_TROUBLESHOOTING.md` - Common environment variable setup issues
- `DESIGN_GUIDE_SOFT.md` - Design consistency guidelines
- `GIT_SECURITY.md` - Git workflow and security practices

## Testing

Currently, no automated tests are configured. For future test setup:
- **Unit/Integration**: Vitest + @testing-library/react
- **E2E**: Playwright (guided by `e2e-runner` agent)
- Target: 80% coverage minimum

See global rules in `~/.claude/rules/typescript/testing.md` for testing patterns.

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Vite Docs**: https://vite.dev
- **TailwindCSS**: https://tailwindcss.com/docs
- **React Hook Form**: https://react-hook-form.com
- **date-fns**: https://date-fns.org/docs
- **Recharts**: https://recharts.org
- **React Router**: https://reactrouter.com
