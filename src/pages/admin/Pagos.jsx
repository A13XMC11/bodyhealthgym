import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'


const PRECIOS_BASE = { mensual: 25, diario: 3, inscripcion: 5 }

function calcularMonto(tipo, promo, precioBase) {
  let base = precioBase
  if (!promo) return base
  if (promo.tipo === 'porcentaje') return base - (base * promo.valor) / 100
  if (promo.tipo === 'precio_fijo') return promo.valor
  if (promo.tipo === '2x1') return base
  if (promo.tipo === 'combo') return promo.valor
  return base
}

export default function Pagos() {
  const { user } = useAuth()
  const [pagos, setPagos] = useState([])
  const [clientes, setClientes] = useState([])
  const [promociones, setPromociones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPromo, setSelectedPromo] = useState(null)
  const [montoCalculado, setMontoCalculado] = useState(0)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [precioBase, setPrecioBase] = useState(PRECIOS_BASE.mensual)

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { tipo: 'mensual', precio_diario: 3 }
  })

  const tipoWatch = watch('tipo')
  const promoWatch = watch('promocion_id')
  const precioDiario = watch('precio_diario')

  useEffect(() => {
    fetchAll()
  }, [user])

  useEffect(() => {
    let base = PRECIOS_BASE[tipoWatch] ?? Number(precioDiario) ?? 3
    if (tipoWatch === 'diario') base = Number(precioDiario) || 3
    setPrecioBase(base)
    const promo = promociones.find((p) => p.id === promoWatch)
    setSelectedPromo(promo || null)
    setMontoCalculado(calcularMonto(tipoWatch, promo, base))
  }, [tipoWatch, promoWatch, precioDiario, promociones])

  const fetchAll = async () => {
    setLoading(true)
    const [pagosRes, clientesRes, promosRes] = await Promise.all([
      supabase.from('payments').select('*, clients(nombre, apellido), promotions(nombre)').order('fecha_pago', { ascending: false }),
      supabase.from('clients').select('id, nombre, apellido').eq('estado', 'activo'),
      supabase.from('promotions').select('*').eq('activa', true),
    ])
    setPagos(pagosRes.data || [])
    setClientes(clientesRes.data || [])
    setPromociones(promosRes.data || [])
    setLoading(false)
  }

  const onSubmit = async (formData) => {
    setSaving(true)
    try {
      const promo = promociones.find((p) => p.id === formData.promocion_id)
      let base = PRECIOS_BASE[formData.tipo] ?? 3
      if (formData.tipo === 'diario') base = Number(formData.precio_diario) || 3
      const monto = calcularMonto(formData.tipo, promo, base)
      const today = new Date().toISOString().split('T')[0]

      await supabase.from('payments').insert({
        client_id: formData.client_id,
        tipo: formData.tipo,
        monto,
        fecha_pago: today,
        mes_correspondiente: today.substring(0, 7),
        promocion_id: formData.promocion_id || null,
        notas: formData.notas || null,
      })

      if (formData.tipo === 'mensual') {
        const vencimiento = new Date()
        vencimiento.setMonth(vencimiento.getMonth() + 1)
        await supabase.from('memberships').upsert({
          client_id: formData.client_id,
          tipo: 'mensual',
          fecha_inicio: today,
          fecha_vencimiento: vencimiento.toISOString().split('T')[0],
          estado: 'activa',
        }, { onConflict: 'client_id' })
      }

      toast.success(`Pago registrado — $${monto.toFixed(2)}`)
      reset()
      setShowModal(false)
      fetchAll()
    } catch (err) {
      toast.error('Error al registrar pago')
    }
    setSaving(false)
  }

  const filtrados = filtroTipo ? pagos.filter((p) => p.tipo === filtroTipo) : pagos

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Pagos</h2>
          <p className="text-gym-gray text-sm mt-1">{pagos.length} registros</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar pago
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gym-gray" />
        {['', 'mensual', 'diario', 'inscripcion'].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroTipo(tipo)}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${filtroTipo === tipo ? 'bg-gym-red text-white' : 'bg-gym-dark text-gym-gray hover:text-white'}`}
          >
            {tipo === '' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gym-dark border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase">Cliente</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase">Tipo</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase">Monto</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase">Fecha</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase">Promoción</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase">Notas</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((pago) => (
                  <tr key={pago.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 text-white text-sm font-medium">
                      {pago.clients ? `${pago.clients.nombre} ${pago.clients.apellido}` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${
                        pago.tipo === 'mensual' ? 'bg-blue-500/10 text-blue-400' :
                        pago.tipo === 'diario' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                        {pago.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gym-red font-black">${Number(pago.monto).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gym-gray text-sm">
                      {format(new Date(pago.fecha_pago), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-6 py-4 text-gym-gray text-sm">
                      {pago.promotions?.nombre || '—'}
                    </td>
                    <td className="px-6 py-4 text-gym-gray text-sm">{pago.notas || '—'}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-gym-gray">Sin pagos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Registrar Pago</h3>
              <button onClick={() => { setShowModal(false); reset() }} className="text-gym-gray hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-gym-gray text-xs mb-1">Cliente</label>
                <select {...register('client_id', { required: true })}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Tipo de pago</label>
                <select {...register('tipo')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red">
                  <option value="mensual">Mensual — $25</option>
                  <option value="diario">Diario</option>
                  <option value="inscripcion">Inscripción — $5</option>
                </select>
              </div>
              {tipoWatch === 'diario' && (
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Precio diario ($)</label>
                  <input {...register('precio_diario')} type="number" step="0.01"
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    placeholder="3.00" />
                </div>
              )}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Promoción (opcional)</label>
                <select {...register('promocion_id')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red">
                  <option value="">Sin promoción</option>
                  {promociones.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.tipo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Notas (opcional)</label>
                <input {...register('notas')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                  placeholder="Observaciones..." />
              </div>

              {/* Monto calculado */}
              <div className="bg-gym-black border border-gym-red/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-gym-gray text-xs">Precio base</div>
                  <div className="text-white text-sm font-semibold">${precioBase.toFixed(2)}</div>
                </div>
                {selectedPromo && (
                  <div className="text-center">
                    <div className="text-gym-gray text-xs">Promoción</div>
                    <div className="text-gym-red text-sm font-semibold">{selectedPromo.nombre}</div>
                  </div>
                )}
                <div className="text-right">
                  <div className="text-gym-gray text-xs">Total a cobrar</div>
                  <div className="text-gym-red text-2xl font-black">${montoCalculado.toFixed(2)}</div>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                {saving ? 'Guardando...' : `Registrar — $${montoCalculado.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
