import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Tag, Loader } from 'lucide-react'
import { fechaHoy, formatearFecha } from '../../lib/dates'

export default function Promociones() {
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const { data } = await supabase
          .from('promotions')
          .select('*')
          .eq('activa', true)
          .gte('fecha_fin', fechaHoy())
          .order('created_at', { ascending: false })
        setPromos(data || [])
      } catch {
        setPromos([])
      } finally {
        setLoading(false)
      }
    }
    fetchPromos()
  }, [])

  const tipoLabel = {
    '2x1': '2×1',
    porcentaje: '% OFF',
    precio_fijo: 'Precio especial',
    combo: 'Combo',
  }

  if (loading) {
    return (
      <section id="promociones" className="py-24 px-4 bg-gym-dark flex justify-center">
        <Loader className="w-6 h-6 text-gym-red animate-spin" />
      </section>
    )
  }

  if (promos.length === 0) return null

  return (
    <section id="promociones" className="py-24 px-4 bg-gym-dark">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-gym-red text-sm font-bold tracking-widest uppercase">Tiempo limitado</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-3">
            PROMOCIONES <span className="text-gym-red">ACTIVAS</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {promos.map((promo) => (
            <div
              key={promo.id}
              className="bg-gym-black border border-gym-red/30 rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-gym-red text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                {tipoLabel[promo.tipo] || promo.tipo}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-gym-red" />
                <h3 className="text-white font-bold">{promo.nombre}</h3>
              </div>
              <p className="text-gym-gray text-sm mb-4">{promo.descripcion}</p>
              {promo.fecha_fin && (
                <p className="text-gym-red text-xs font-semibold">
                  Válido hasta: {formatearFecha(promo.fecha_fin)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
