import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, UserCheck, UserX, X, CreditCard, ClipboardList, MessageCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js'
import { fechaHoy, mesHoy, parseFechaLocal, formatFechaISO, formatearFecha } from '../../lib/dates'

function countryCodeToFlag(countryCode) {
  return countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) {
    return raw
  }
  if (digits.startsWith('09') && digits.length === 10) {
    return `+593${digits.slice(1)}`
  }
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
    const parsed = parsePhoneNumberFromString(raw, 'EC')
    return parsed ? parsed.number : raw
  }
  return raw
}

function parseBadge(raw) {
  if (!raw) return null
  const normalized = normalizePhone(raw)
  const parsed = parsePhoneNumberFromString(normalized)
  if (!parsed?.country) return null
  return { flag: countryCodeToFlag(parsed.country), code: `+${parsed.countryCallingCode}` }
}

function PhoneInputWithCode({ field, error }) {
  const [touched, setTouched] = useState(false)
  const raw = field.value || ''

  const normalized = raw ? normalizePhone(raw) : ''
  const isValid = normalized ? isValidPhoneNumber(normalized) : null
  const badge = parseBadge(raw)

  const borderStyle = !touched || raw === ''
    ? {}
    : isValid
      ? { borderColor: '#22c55e' }
      : { borderColor: '#ef4444' }

  const handleChange = (e) => {
    field.onChange(e.target.value)
  }

  const handleBlur = () => {
    setTouched(true)
    if (normalized && normalized !== raw) {
      field.onChange(normalized)
    }
    field.onBlur?.()
  }

  return (
    <div className="space-y-1">
      <div
        className="flex items-center bg-gym-black border border-white/10 rounded-lg overflow-hidden transition-all duration-200"
        style={borderStyle}
      >
        <div className={`transition-all duration-200 flex items-center gap-1.5 pl-3 flex-shrink-0 ${badge ? 'opacity-100 w-auto pr-2 border-r border-white/10' : 'opacity-0 w-0 overflow-hidden'}`}>
          {badge && (
            <>
              <span className="text-base leading-none">{badge.flag}</span>
              <span className="text-white text-xs font-semibold">{badge.code}</span>
            </>
          )}
        </div>
        <input
          type="tel"
          value={raw}
          onChange={handleChange}
          onBlur={handleBlur}
          className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm focus:outline-none placeholder-gym-gray/60"
          placeholder="+593 987 654 321 o 0998020967"
        />
      </div>
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  )
}


export default function Clientes() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPagos, setShowPagos] = useState(null)
  const [pagos, setPagos] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('pagos')
  const [highlightId, setHighlightId] = useState(null)
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('')
  const [loadingPartialPayment, setLoadingPartialPayment] = useState(false)
  const [dupErrors, setDupErrors] = useState({ email: null, telefono: null })
  const [membershipsMap, setMembershipsMap] = useState({})

  const { register, handleSubmit, reset, control, getValues, formState: { errors } } = useForm({
    defaultValues: {
      fechaInscripcion: fechaHoy()
    }
  })

  useEffect(() => { fetchClients() }, [user])

  useEffect(() => {
    const hid = searchParams.get('highlight')
    if (!hid) return
    setHighlightId(hid)
    const timer = setTimeout(() => {
      setHighlightId(null)
      searchParams.delete('highlight')
      setSearchParams(searchParams)
    }, 3000)
    return () => clearTimeout(timer)
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clients.filter((c) =>
      `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(q)
    ))
  }, [search, clients])

  const fetchClients = async () => {
    setLoading(true)
    const [clientsRes, membershipsRes] = await Promise.all([
      supabase.from('clients').select('*').order('fecha_inscripcion', { ascending: false }),
      supabase.from('memberships').select('client_id, fecha_vencimiento, estado').order('fecha_vencimiento', { ascending: false }),
    ])
    if (clientsRes.error) toast.error('Error al cargar clientes')
    else {
      setClients(clientsRes.data || [])
      setFiltered(clientsRes.data || [])
      const map = {}
      for (const m of membershipsRes.data || []) {
        if (!map[m.client_id]) map[m.client_id] = m
      }
      setMembershipsMap(map)
    }
    setLoading(false)
  }

  const onSubmit = async (formData) => {
    setSaving(true)
    setDupErrors({ email: null, telefono: null })
    try {
      // Verificar duplicados antes de cualquier insert
      const telefonoNorm = formData.telefono ? normalizePhone(formData.telefono) : null
      const condiciones = [`email.eq.${formData.email}`]
      if (telefonoNorm) condiciones.push(`telefono.eq.${telefonoNorm}`)

      const { data: existentes } = await supabase
        .from('clients')
        .select('email, telefono')
        .or(condiciones.join(','))

      if (existentes?.length > 0) {
        const newDupErrors = { email: null, telefono: null }
        for (const dup of existentes) {
          if (dup.email === formData.email)
            newDupErrors.email = 'Ya existe un cliente registrado con este correo electrónico'
          if (telefonoNorm && dup.telefono === telefonoNorm)
            newDupErrors.telefono = 'Ya existe un cliente registrado con este número de teléfono'
        }
        setDupErrors(newDupErrors)
        setSaving(false)
        return
      }

      const fechaInscripcion = formData.fechaInscripcion?.trim()
        ? formData.fechaInscripcion
        : fechaHoy()
      const tipoPago = formData.tipoPago || 'inscripcion_mensual'
      const descuento = Number(formData.descuento) || 0

      // Pagos base con tipos válidos para el CHECK constraint de Supabase
      // CHECK (tipo IN ('inscripcion', 'mensual', 'diario'))
      const PAGOS_BASE = {
        inscripcion_mensual: [{ tipo: 'inscripcion', monto: 5 }, { tipo: 'mensual', monto: 25 }],
        solo_mensual:        [{ tipo: 'mensual', monto: 25 }],
        solo_diario:         [{ tipo: 'diario', monto: 3 }],
        solo_inscripcion:    [{ tipo: 'inscripcion', monto: 5 }],
        sin_pago:            [],
      }
      const pagosBase = PAGOS_BASE[tipoPago] ?? []
      const montoTotal = pagosBase.reduce((s, p) => s + p.monto, 0)
      const descuentoAplicado = Math.min(descuento, montoTotal)
      const montoFinal = montoTotal - descuentoAplicado

      // Distribuir el descuento de primero a último (inscripción antes que mensual)
      let pendiente = descuentoAplicado
      const pagosFinales = pagosBase.map((p) => ({ ...p }))
      for (let i = 0; i < pagosFinales.length && pendiente > 0; i++) {
        const reduccion = Math.min(pendiente, pagosFinales[i].monto)
        pagosFinales[i].monto -= reduccion
        pendiente -= reduccion
      }

      // 1. Crear cliente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono ? normalizePhone(formData.telefono) : null,
          fecha_inscripcion: fechaInscripcion,
          estado: 'activo',
        })
        .select()
        .single()
      if (clientError) throw {
        tipo: 'cliente',
        error: clientError,
        mensaje: clientError.code === '23505'
          ? 'Ya existe un cliente registrado con ese correo electrónico.'
          : 'Error al registrar cliente. Verifica los datos.',
      }

      // 2. Insertar pagos con montos ya descontados
      if (pagosFinales.length > 0) {
        const notasBase = pagosBase
          .map((p) => `${p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)} $${p.monto.toFixed(2)}`)
          .join(' + ')
        const notasDescuento = descuentoAplicado > 0
          ? ` — desc. -$${descuentoAplicado.toFixed(2)} → cobra $${montoFinal.toFixed(2)}`
          : ''
        const notas = notasBase + notasDescuento

        const pagosParaInsert = pagosFinales.map((p) => ({
          client_id: client.id,
          tipo: p.tipo,
          monto: p.monto,
          fecha_pago: fechaInscripcion,
          mes_correspondiente: fechaInscripcion.substring(0, 7),
          notas,
        }))

        const { error: pagoError } = await supabase.from('payments').insert(pagosParaInsert)
        if (pagoError) throw { tipo: 'pago', error: pagoError }
      }

      // 3. Crear membresía si corresponde
      if (tipoPago === 'inscripcion_mensual' || tipoPago === 'solo_mensual') {
        const vencimiento = parseFechaLocal(fechaInscripcion)
        vencimiento.setMonth(vencimiento.getMonth() + 1)
        await supabase.from('memberships').insert({
          client_id: client.id,
          tipo: 'mensual',
          fecha_inicio: fechaInscripcion,
          fecha_vencimiento: formatFechaISO(vencimiento),
          estado: 'activa',
        })
      }

      // 4. Primera asistencia: el día de inscripción cuenta como primera visita
      await supabase.from('attendance').insert({
        client_id: client.id,
        fecha: fechaInscripcion,
        hora: format(new Date(), 'HH:mm'),
      })

      const mensaje = montoFinal > 0
        ? `✅ Cliente registrado — $${montoFinal.toFixed(2)} cobrado`
        : '✅ Cliente registrado sin pago inicial'
      toast.success(mensaje)
      reset()
      setTimeout(() => setShowModal(false), 1500)
      fetchClients()
    } catch (err) {
      if (err?.tipo === 'pago') {
        toast.error('Cliente registrado pero hubo un error al generar el pago. Contacta al administrador.')
        // El cliente ya fue creado, no se puede hacer rollback automático en Supabase JS
        // Se notifica para revisión manual
      } else {
        toast.error(err?.mensaje || 'Error al registrar cliente. Verifica los datos.')
      }
      console.error(err?.error ?? err)
    }
    setSaving(false)
  }

  const toggleEstado = async (client) => {
    const nuevoEstado = client.estado === 'activo' ? 'inactivo' : 'activo'
    const { error } = await supabase.from('clients').update({ estado: nuevoEstado }).eq('id', client.id)
    if (error) toast.error('Error al actualizar')
    else {
      toast.success(`Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`)
      fetchClients()
    }
  }

  const verPagos = async (client) => {
    setShowPagos(client)
    setActiveTab('pagos')
    const [p, a] = await Promise.all([
      supabase
        .from('payments')
        .select('id, client_id, tipo, monto, fecha_pago, notas, clients(id, nombre, apellido, email, telefono), promotions(nombre)')
        .eq('client_id', client.id)
        .order('fecha_pago', { ascending: false }),
      supabase
        .from('attendance')
        .select('*')
        .eq('client_id', client.id)
        .order('fecha', { ascending: false }),
    ])
    setPagos(p.data || [])
    setAsistencias(a.data || [])
  }

  const addPartialPayment = async () => {
    if (!partialPaymentAmount || Number(partialPaymentAmount) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    if (!showPagos) return

    setLoadingPartialPayment(true)
    try {
      const { error } = await supabase.from('payments').insert({
        client_id: showPagos.id,
        tipo: 'pago_parcial',
        monto: Number(partialPaymentAmount),
        fecha_pago: fechaHoy(),
        mes_correspondiente: mesHoy(),
        notas: `Pago parcial - $${Number(partialPaymentAmount).toFixed(2)}`
      })

      if (error) throw error

      toast.success(`Pago parcial de $${Number(partialPaymentAmount).toFixed(2)} registrado`)
      setPartialPaymentAmount('')
      verPagos(showPagos)
    } catch (err) {
      toast.error(err.message || 'Error al registrar pago parcial')
    }
    setLoadingPartialPayment(false)
  }

  const getMembershipStatus = (clientId) => {
    const m = membershipsMap[clientId]
    if (!m) return { label: 'Sin membresía', color: 'bg-gray-500/10 text-gray-400' }
    const hoy = parseFechaLocal(fechaHoy())
    const vence = parseFechaLocal(m.fecha_vencimiento)
    if (vence >= hoy) {
      return { label: `Activa · ${formatearFecha(m.fecha_vencimiento, 'day')}`, color: 'bg-green-500/10 text-green-400' }
    }
    return { label: `Vencida · ${formatearFecha(m.fecha_vencimiento, 'day')}`, color: 'bg-red-500/10 text-red-400' }
  }

  const sendWhatsApp = (phone, message) => {
    if (!phone) {
      alert('Este cliente no tiene teléfono registrado')
      return
    }
    // Remove spaces, dashes, parentheses but keep the + sign and numbers
    const clean = phone.replace(/[\s\-()]/g, '').replace(/[^\d+]/g, '')
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Clientes</h2>
          <p className="text-gym-gray text-xs sm:text-sm mt-1">{clients.length} registrados</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setDupErrors({ email: null, telefono: null }) }}
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl btn-interactive text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Nuevo cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gym-gray flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gym-dark border border-white/10 rounded-lg sm:rounded-xl pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-white text-sm placeholder-gym-gray focus:outline-none focus:border-gym-red transition-colors"
        />
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Inscripción</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Estado</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Membresía</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => {
                    const membershipStatus = getMembershipStatus(client.id)
                    return (
                    <tr
                      key={client.id}
                      id={`row-${client.id}`}
                      className={`border-b border-white/5 hover:bg-white/2 transition-all ${
                        client.id === highlightId ? 'bg-gym-red/10 outline outline-1 outline-gym-red/50' : ''
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="font-semibold text-white text-xs sm:text-sm">{client.nombre} {client.apellido}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs sm:text-sm truncate">{client.email}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs">
                        {client.fecha_inscripcion ? formatearFecha(client.fecha_inscripcion, 'short') : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${client.estado === 'activo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {client.estado}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${membershipStatus.color}`}>
                          {membershipStatus.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button onClick={() => verPagos(client)} className="p-1.5 text-gym-gray hover:text-white btn-icon" title="Ver pagos">
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleEstado(client)} className="p-1.5 text-gym-gray hover:text-white btn-icon" title="Cambiar estado">
                            {client.estado === 'activo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 sm:py-12 text-gym-gray text-sm">No se encontraron clientes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2 p-3">
              {filtered.map((client) => {
                const membershipStatus = getMembershipStatus(client.id)
                return (
                  <div key={client.id} id={`row-${client.id}`} className={`bg-gym-black rounded-lg p-3 space-y-2 ${client.id === highlightId ? 'border-2 border-gym-red' : 'border border-white/5'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{client.nombre} {client.apellido}</div>
                        <div className="text-gym-gray text-xs mt-1 truncate">{client.email}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${client.estado === 'activo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {client.estado}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gym-gray">Inscripción</span>
                      <span className="text-white">{client.fecha_inscripcion ? formatearFecha(client.fecha_inscripcion, 'short') : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gym-gray">Membresía</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${membershipStatus.color}`}>{membershipStatus.label}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button onClick={() => verPagos(client)} className="flex-1 p-2 text-xs text-gym-gray hover:text-white hover:bg-white/5 rounded btn-icon flex items-center justify-center gap-1" title="Ver pagos">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pagos</span>
                      </button>
                      <button onClick={() => toggleEstado(client)} className="flex-1 p-2 text-xs text-gym-gray hover:text-white hover:bg-white/5 rounded btn-icon flex items-center justify-center gap-1" title="Cambiar estado">
                        {client.estado === 'activo' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{client.estado === 'activo' ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-gym-gray text-sm">No se encontraron clientes</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal: New Client */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Nuevo Cliente</h3>
              <button onClick={() => { setShowModal(false); reset(); setDupErrors({ email: null, telefono: null }) }} className="text-gym-gray hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Nombre</label>
                  <input
                    {...register('nombre', { required: true })}
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Apellido</label>
                  <input
                    {...register('apellido', { required: true })}
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    placeholder="Pérez"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Correo electrónico</label>
                <input
                  {...register('email', { required: true, onChange: () => setDupErrors((p) => ({ ...p, email: null })) })}
                  type="email"
                  className={`w-full bg-gym-black border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red ${dupErrors.email ? 'border-red-500' : 'border-white/10'}`}
                  placeholder="juan@email.com"
                />
                {dupErrors.email && (
                  <p className="text-red-400 text-xs mt-1">{dupErrors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Teléfono (opcional)</label>
                <Controller
                  name="telefono"
                  control={control}
                  rules={{
                    validate: (v) => {
                      if (!v || v.trim() === '') return true
                      const normalized = normalizePhone(v)
                      return isValidPhoneNumber(normalized)
                        ? true
                        : 'Número de teléfono inválido. Si eres de Ecuador escribe: 0998020967 o con prefijo internacional: +593998020967'
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <PhoneInputWithCode
                      field={{
                        ...field,
                        onChange: (v) => { field.onChange(v); setDupErrors((p) => ({ ...p, telefono: null })) },
                      }}
                      error={fieldState.error?.message || dupErrors.telefono}
                    />
                  )}
                />
              </div>

              {/* Payment Type Selection */}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Tipo de pago inicial</label>
                <select
                  {...register('tipoPago', { required: true })}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                >
                  <option value="inscripcion_mensual">Inscripción + Mensual ($30)</option>
                  <option value="solo_mensual">Solo Mensual ($25)</option>
                  <option value="solo_diario">Solo Diario ($3)</option>
                  <option value="solo_inscripcion">Solo Inscripción ($5)</option>
                  <option value="sin_pago">Sin pago inicial</option>
                </select>
              </div>

              {/* Registration Date */}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Fecha de inscripción</label>
                <Controller
                  name="fechaInscripcion"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <input
                        {...field}
                        type="date"
                        className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 pl-10 text-white text-sm focus:outline-none focus:border-gym-red"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gym-gray pointer-events-none" />
                    </div>
                  )}
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Descuento ($)</label>
                <input
                  {...register('descuento', {
                    validate: (v) => {
                      const monto = Number(v) || 0
                      if (monto === 0) return true
                      const TOTALES = {
                        inscripcion_mensual: 30,
                        solo_mensual: 25,
                        solo_diario: 3,
                        solo_inscripcion: 5,
                        sin_pago: 0,
                      }
                      const tipoPago = getValues('tipoPago') || 'inscripcion_mensual'
                      const total = TOTALES[tipoPago] ?? 0
                      return monto <= total || `El descuento no puede superar el total de $${total.toFixed(2)}`
                    },
                  })}
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full bg-gym-black border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red ${errors.descuento ? 'border-red-500' : 'border-white/10'}`}
                  placeholder="0.00"
                />
                {errors.descuento && (
                  <p className="text-red-400 text-xs mt-1">{errors.descuento.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl btn-interactive mt-4"
              >
                {saving ? 'Registrando...' : 'Registrar cliente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Payment history + Attendance */}
      {showPagos && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-white font-bold text-lg">
                  Historial — {showPagos.nombre} {showPagos.apellido}
                </h3>
                <p className="text-gym-gray text-xs mt-1">{showPagos.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    sendWhatsApp(
                      showPagos.telefono,
                      `Hola ${showPagos.nombre}, ¿cómo estás? Te escribo de Body Health Gym. 💪`
                    )
                  }
                  title={showPagos.telefono ? 'Enviar WhatsApp' : 'Sin teléfono registrado'}
                  className={`p-2 rounded-lg btn-icon flex-shrink-0 ${
                    showPagos.telefono
                      ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={() => setShowPagos(null)} className="text-gym-gray hover:text-white btn-icon">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 mb-6 bg-gym-black rounded-xl p-1">
              {[
                ['pagos', '💳 Pagos'],
                ['asistencias', '📋 Asistencias'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg nav-interactive ${
                    activeTab === tab ? 'bg-gym-red text-white' : 'text-gym-gray hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Pagos Tab */}
            {activeTab === 'pagos' && (
              <>
                {pagos.length === 0 ? (
                  <p className="text-gym-gray text-center py-8">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-3">
                    {pagos.map((pago) => (
                      <div key={pago.id} className="bg-gym-black border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm font-semibold capitalize">{pago.tipo}</div>
                          <div className="text-gym-gray text-xs mt-0.5">
                            {formatearFecha(pago.fecha_pago)}
                            {pago.promotions && <span className="ml-2 text-gym-red">· {pago.promotions.nombre}</span>}
                          </div>
                          {pago.notas && <div className="text-gym-gray text-xs mt-0.5 italic">{pago.notas}</div>}
                        </div>
                        <div className="text-gym-red font-black text-lg">${Number(pago.monto).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Partial Payment Section */}
                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                  <h4 className="text-white font-bold text-sm">Registrar Pago Parcial</h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={partialPaymentAmount}
                      onChange={(e) => setPartialPaymentAmount(e.target.value)}
                      placeholder="Monto ($)"
                      className="flex-1 bg-gym-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gym-red"
                    />
                    <button
                      onClick={addPartialPayment}
                      disabled={loadingPartialPayment}
                      className="bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg btn-interactive text-sm"
                    >
                      {loadingPartialPayment ? 'Guardando...' : 'Registrar'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Asistencias Tab */}
            {activeTab === 'asistencias' && (
              <>
                {asistencias.length === 0 ? (
                  <p className="text-gym-gray text-center py-8">Sin asistencias registradas</p>
                ) : (
                  <div className="space-y-3">
                    {asistencias.map((asist) => (
                      <div key={asist.id} className="bg-gym-black border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm font-semibold">
                            {formatearFecha(asist.fecha)}
                          </div>
                          <div className="text-gym-gray text-xs mt-0.5">{asist.hora}</div>
                        </div>
                        <ClipboardList className="w-4 h-4 text-gym-red" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
