import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatearFecha, parseFechaLocal } from '../../lib/dates'


const MESES_NAV = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOW = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

function CalendarPicker({ value, onChange, minDate, placeholder = 'Seleccionar fecha' }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)

  const today = new Date()
  const selected = value ? parseFechaLocal(value) : null
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  // Sincronizar vista al abrir
  const handleOpen = () => {
    const base = selected ?? today
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setOpen((o) => !o)
  }

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  // Celdas del mes: nulls para días vacíos antes del primero
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const toISO = (d) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const isSelected = (d) =>
    d && selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === d

  const isDisabled = (d) => d && minDate && toISO(d) < minDate

  const handleSelect = (d) => {
    if (!d || isDisabled(d)) return
    onChange(toISO(d))
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-left focus:outline-none focus:border-gym-red flex items-center justify-between gap-2"
      >
        <span className={value ? 'text-white' : 'text-gym-gray/60'}>
          {value ? formatearFecha(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-gym-gray flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-gym-dark border border-white/10 rounded-xl shadow-2xl p-3 w-64 left-0">
          {/* Cabecera de navegación */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded text-gym-gray hover:text-white hover:bg-white/5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm font-semibold">
              {MESES_NAV[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded text-gym-gray hover:text-white hover:bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Nombres de días */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map((d) => (
              <div key={d} className="text-center text-gym-gray text-xs py-0.5">{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => (
              <button
                key={i}
                type="button"
                disabled={!d || isDisabled(d)}
                onClick={() => handleSelect(d)}
                className={`
                  aspect-square flex items-center justify-center text-xs rounded-lg transition-colors
                  ${!d ? '' :
                    isSelected(d) ? 'bg-gym-red text-white font-bold' :
                    isDisabled(d) ? 'text-white/20 cursor-not-allowed' :
                    'text-white hover:bg-white/10'}
                `}
              >
                {d ?? ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Promociones() {
  const { user } = useAuth()
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const tipoWatch = watch('tipo')
  const fechaInicioWatch = watch('fecha_inicio')
  const fechaFinWatch = watch('fecha_fin')

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

  const eliminarPromo = async (promo) => {
    const confirmar = window.confirm(`¿Estás seguro que deseas eliminar la promoción "${promo.nombre}"? Esta acción no se puede deshacer.`)
    if (!confirmar) return
    const { error } = await supabase.from('promotions').delete().eq('id', promo.id)
    if (error) {
      toast.error('Error al eliminar promoción')
    } else {
      setPromos((prev) => prev.filter((p) => p.id !== promo.id))
      toast.success('Promoción eliminada')
    }
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
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl btn-interactive text-sm sm:text-base"
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
                  Hasta: {formatearFecha(promo.fecha_fin)}
                </p>
              )}
              <div className="flex items-center gap-2 pt-2 sm:pt-3 border-t border-white/5">
                <button onClick={() => openEdit(promo)} className="flex items-center gap-1 text-gym-gray hover:text-white text-xs btn-icon">
                  <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> <span className="hidden sm:inline">Editar</span>
                </button>
                <button onClick={() => eliminarPromo(promo)} className="flex items-center gap-1 text-red-500 hover:text-red-400 text-xs btn-icon">
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" /> <span className="hidden sm:inline">Eliminar</span>
                </button>
                <button onClick={() => toggleActiva(promo)} className={`flex items-center gap-1 text-xs btn-icon ml-auto flex-shrink-0 ${promo.activa ? 'text-green-400 hover:text-gym-gray' : 'text-gym-gray hover:text-green-400'}`}>
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
                  <CalendarPicker
                    value={fechaInicioWatch || null}
                    onChange={(v) => {
                      setValue('fecha_inicio', v)
                      // Si fecha_fin quedó antes de la nueva inicio, limpiarla
                      if (fechaFinWatch && fechaFinWatch < v) setValue('fecha_fin', null)
                    }}
                    placeholder="Seleccionar fecha"
                  />
                </div>
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Fecha fin</label>
                  <CalendarPicker
                    value={fechaFinWatch || null}
                    onChange={(v) => setValue('fecha_fin', v)}
                    minDate={fechaInicioWatch || undefined}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl btn-interactive">
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear promoción'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
