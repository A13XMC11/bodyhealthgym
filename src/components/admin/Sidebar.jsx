import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Tag, BarChart2 } from 'lucide-react'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/clientes', icon: Users, label: 'Clientes' },
  { to: '/admin/pagos', icon: CreditCard, label: 'Pagos' },
  { to: '/admin/promociones', icon: Tag, label: 'Promociones' },
  { to: '/admin/reportes', icon: BarChart2, label: 'Reportes' },
]

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-64 bg-gym-dark border-r border-white/5 flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="p-5 sm:p-6 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logoBHG.png"
            alt="Body Health Gym"
            className="w-9 h-9 object-contain flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="text-white font-black text-xs sm:text-sm leading-tight truncate">BODY HEALTH</div>
            <div className="text-gym-red font-black text-xs sm:text-sm leading-tight truncate">GYM</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium nav-interactive whitespace-nowrap sm:whitespace-normal transition-all duration-150 ${
                isActive
                  ? 'bg-gym-red text-white shadow-lg shadow-gym-red/20'
                  : 'text-gym-gray hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 transition-transform duration-150" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden text-xs">{item.label.charAt(0)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 sm:p-5 border-t border-white/5 flex-shrink-0">
        <div className="text-gym-gray text-xs text-center font-medium tracking-wide">Panel Admin</div>
      </div>
    </aside>
  )
}
