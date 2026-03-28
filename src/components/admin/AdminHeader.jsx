import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut, User, Search, X, Menu } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminHeader({ onMenuClick, isSidebarOpen }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef(null)

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Search with debounce
    const timer = setTimeout(async () => {
      try {
        const q = `%${query}%`
        const { data } = await supabase
          .from('clients')
          .select('id, nombre, apellido, telefono, email, estado')
          .or(`nombre.ilike.${q},apellido.ilike.${q},telefono.ilike.${q}`)
          .limit(5)

        setResults(data || [])
        setIsOpen(true)
      } catch (err) {
        console.error('Search error:', err)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Outside click detection
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (client) => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    navigate(`/admin/clientes?highlight=${client.id}`)
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sesión cerrada')
    navigate('/')
  }

  return (
    <header className="h-14 sm:h-16 bg-gym-dark border-b border-white/5 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-6 flex-shrink-0">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-white hover:text-gym-red transition-colors p-2 -m-2"
      >
        <Menu className={`w-5 h-5 transition-transform ${isSidebarOpen ? 'rotate-90' : ''}`} />
      </button>

      <div className="hidden sm:flex items-center gap-3">
        <h1 className="text-white font-semibold text-sm">Panel de Administración</h1>
      </div>

      {/* Search - Hidden on very small screens, resized on mobile */}
      <div ref={searchRef} className="relative flex-1 max-w-xs sm:max-w-sm hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gym-gray" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setIsOpen(true)}
          autoComplete="off"
          placeholder="Buscar cliente..."
          className="w-full bg-gym-black border border-white/10 rounded-lg pl-9 pr-8 py-2 text-white text-xs sm:text-sm placeholder-gym-gray focus:outline-none focus:border-gym-red transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gym-gray hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {isOpen && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-gym-dark border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-gym-gray text-xs sm:text-sm">Sin resultados</div>
            ) : (
              results.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-white text-xs sm:text-sm font-semibold">
                      {client.nombre} {client.apellido}
                    </div>
                    <div className="text-gym-gray text-xs">
                      {client.telefono || client.email}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* User Info and Logout */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gym-gray">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="truncate max-w-[150px]">{user?.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-gym-gray hover:text-gym-red transition-colors text-xs sm:text-sm p-2 -m-2"
          title="Salir"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
