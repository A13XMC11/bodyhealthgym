import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, Pencil, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'


export default function Promociones() {
  const { user } = useAuth()
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const tipoWatch = watch('tipo')

  useEffect(() => { fetchPromos() }, [user])

  const fetchPromos = async () => {
    setLoading(true)
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
    setPromos(data || [])
    setLoading(false)
  }

  const openEdit = (promo) => {
    setEditando(promo)
    setValue('nombre', promo.nombre)
    setValue('tipo', promo.tipo)
    setValue('valor', promo.valor)
    setValue('descripcion', promo.descripcion)
    setValue('fecha_inicio', promo.fecha_inicio)
    setValue('fecha_fin', promo.fecha_fin)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditando(null)
    reset()
  }

  const onSubmit = async (formData) => {
    setSaving(true)
    try {
      const payload = { ...formData, valor: Number(formData.valor), activa: true }
      if (editando) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editando.id)
        if (error) throw error
        toast.success('Promoción actualizada')
      } else {
        const { error } = await supabase.from('promotions').insert(payload)
        if (error) throw error
        toast.success('Promoción creada')
      }
      closeModal()
      fetchPromos()
    } catch (err) {
      toast.error('Error al guardar promoción')
    }
    setSaving(false)
  }

  const toggleActiva = async (promo) => {
    const { error } = await supabase.from('promotions').update({ activa: !promo.activa }).eq('id', promo.id)
    if (error) toast.error('Error al actualizar')
    else {
      toast.success(promo.activa ? 'Promoción desactivada' : 'Promoción activada')
      fetchPromos()
    }
  }

  const tipoLabels = { '2x1': '2×1', porcentaje: 'Porcentaje', precio_fijo: 'Precio fijo', combo: 'Combo' }
  const tipoColors = { '2x1': 'text-blue-400 bg-blue-500/10', porcentaje: 'text-yellow-400 bg-yellow-500/10', precio_fijo: 'text-green-400 bg-green-500/10', combo: 'text-purple-400 bg-purple-500/10' }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Promociones</h2>
          <p className="text-gym-gray text-xs sm:text-sm mt-1">{promos.length} registradas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Nueva promoción</span>
          <span className="sm:hidden">Nueva</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 sm:py-12">
          <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {promos.map((promo) => (
            <div key={promo.id} className={`bg-gym-dark border rounded-lg sm:rounded-2xl p-3 sm:p-5 transition-all ${promo.activa ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
              <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gym-red flex-shrink-0" />
                  <h3 className="text-white font-bold text-xs sm:text-sm truncate">{promo.nombre}</h3>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0 ${tipoColors[promo.tipo]}`}>
                  {tipoLabels[promo.tipo]}
                </span>
              </div>
              <p className="text-gym-gray text-xs mb-2 sm:mb-3 leading-relaxed line-clamp-2">{promo.descripcion}</p>
              <div className="text-gym-red font-black text-lg sm:text-xl mb-1">
                {promo.tipo === 'porcentaje' ? `${promo.valor}% OFF` :
                 promo.tipo === '2x1' ? '2×1' :
                 `$${promo.valor}`}
              </div>
              {promo.fecha_fin && (
                <p className="text-gym-gray text-xs mb-2 sm:mb-4">
                  Hasta: {format(new Date(promo.fecha_fin), "d MMM yyyy", { locale: es })}
                </p>
              )}
              <div className="flex items-center gap-2 pt-2 sm:pt-3 border-t border-white/5">
                <button onClick={() => openEdit(promo)} className="flex items-center gap-1 text-gym-gray hover:text-white text-xs transition-colors">
                  <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> <span className="hidden sm:inline">Editar</span>
                </button>
                <button onClick={() => toggleActiva(promo)} className={`flex items-center gap-1 text-xs transition-colors ml-auto flex-shrink-0 ${promo.activa ? 'text-green-400 hover:text-gym-gray' : 'text-gym-gray hover:text-green-400'}`}>
                  {promo.activa ? <ToggleRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ToggleLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">{promo.activa ? 'Activa' : 'Inactiva'}</span>
                </button>
              </div>
            </div>
          ))}
          {promos.length === 0 && (
            <div className="col-span-full text-center py-12 sm:py-16 text-gym-gray text-sm sm:text-base">
              No hay promociones. ¡Crea la primera!
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">{editando ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
              <button onClick={closeModal} className="text-gym-gray hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-gym-gray text-xs mb-1">Nombre</label>
                <input {...register('nombre', { required: true })}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                  placeholder="Ej: Promoción de verano" />
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Tipo</label>
                <select {...register('tipo', { required: true })}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red">
                  <option value="">Seleccionar tipo...</option>
                  <option value="porcentaje">Porcentaje (% descuento)</option>
                  <option value="precio_fijo">Precio fijo</option>
                  <option value="2x1">2×1</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">
                  Valor {tipoWatch === 'porcentaje' ? '(%)' : tipoWatch === '2x1' ? '(ignorado)' : '($)'}
                </label>
                <input {...register('valor', { required: true })}
                  type="number" step="0.01"
                  disabled={tipoWatch === '2x1'}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red disabled:opacity-40"
                  placeholder={tipoWatch === 'porcentaje' ? '50' : '20.00'} />
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Descripción</label>
                <textarea {...register('descripcion')} rows={3}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red resize-none"
                  placeholder="Describe la promoción..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Fecha inicio</label>
                  <input {...register('fecha_inicio')} type="date"
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red" />
                </div>
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Fecha fin</label>
                  <input {...register('fecha_fin')} type="date"
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red" />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear promoción'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
