import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const links = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Precios', href: '#precios' },
  { label: 'Promociones', href: '#promociones' },
  { label: 'Testimonios', href: '#testimonios' },
  { label: 'Contacto', href: '#contacto' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,box-shadow] duration-300 ${scrolled ? 'bg-gym-black/95 backdrop-blur-md shadow-lg shadow-black/50' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            <img
              src="/logoBHG.png"
              alt="Body Health Gym"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain transition-transform duration-200 ease-out group-hover:scale-105 flex-shrink-0"
            />
            <span className="hidden sm:inline font-black text-base lg:text-lg tracking-tight text-white whitespace-nowrap">
              BODY HEALTH <span className="text-gym-red">GYM</span>
            </span>
            <span className="inline sm:hidden font-black text-sm tracking-tight text-white">
              BH<span className="text-gym-red">G</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-gym-gray hover:text-white transition-colors duration-160 font-medium"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA + mobile */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden md:inline-flex bg-gym-red hover:bg-gym-red-hover text-white text-sm font-bold px-5 py-2 rounded-lg btn-interactive"
            >
              Iniciar Sesión
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-white btn-icon"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-gym-dark border-t border-white/5 py-4 space-y-1 px-2 animate-fade-in">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block text-gym-gray hover:text-white transition-colors duration-160 py-2.5 px-2 rounded-lg font-medium"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className="block bg-gym-red hover:bg-gym-red-hover text-white text-center font-bold px-5 py-2.5 rounded-lg mt-2 btn-interactive"
            >
              Iniciar Sesión
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
