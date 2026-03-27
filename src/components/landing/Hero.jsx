import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gym-black via-gym-dark to-gym-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(220,38,38,0.15)_0%,_transparent_70%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-gym-red/10 border border-gym-red/30 text-gym-red text-sm font-semibold px-4 py-2 rounded-full mb-8">
          <Zap className="w-4 h-4" />
          Transforma tu cuerpo. Transforma tu vida.
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-none tracking-tight mb-6">
          EL GYM QUE{' '}
          <span className="text-gym-red">ESPERA</span>{' '}
          <br />
          TU MEJOR
          <br />
          <span className="text-gym-red">VERSIÓN</span>
        </h1>

        <p className="text-gym-gray text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Equipamiento de primera, entrenadores certificados y un ambiente que te impulsa a superar tus límites cada día.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#precios"
            className="bg-gym-red hover:bg-gym-red-hover text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 active:scale-95"
          >
            ¡Únete Hoy!
          </a>
          <a
            href="#servicios"
            className="border border-white/20 hover:border-white/40 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all hover:bg-white/5"
          >
            Conoce más
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: '500+', label: 'Miembros activos' },
            { value: '10+', label: 'Entrenadores' },
            { value: '5★', label: 'Calificación' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black text-gym-red">{stat.value}</div>
              <div className="text-gym-gray text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
