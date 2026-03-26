import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Tag, Dumbbell, ClipboardList, BarChart2 } from 'lucide-react'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/clientes', icon: Users, label: 'Clientes' },
  { to: '/admin/pagos', icon: CreditCard, label: 'Pagos' },
  { to: '/admin/promociones', icon: Tag, label: 'Promociones' },
  { to: '/admin/asistencia', icon: ClipboardList, label: 'Asistencia' },
  { to: '/admin/reportes', icon: BarChart2, label: 'Reportes' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gym-dark border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gym-red rounded-full flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-black text-sm leading-tight">BODY HEALTH</div>
            <div className="text-gym-red font-black text-sm leading-tight">GYM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gym-red text-white'
                  : 'text-gym-gray hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="text-gym-gray text-xs text-center">Panel de Administración</div>
      </div>
    </aside>
  )
}
