import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, UserCheck, UserX, X, CreditCard, MessageCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pencil, Save, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js'
import { fechaHoy, mesHoy, parseFechaLocal, formatFechaISO, formatearFecha } from '../../lib/dates'
import { fetchCuotasCliente, getCuotaActivaPorMes, crearCuota, registrarAbono } from '../../lib/cuotas'
import AbonosModal from '../../components/admin/AbonosModal'

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


const CAL_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const CAL_DOW = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']

function CalendarPicker({ value, onChange, placeholder = 'Seleccionar fecha' }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const today = new Date()
  const selected = value ? parseFechaLocal(value) : null
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  const handleOpen = () => {
    const base = selected ?? today
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setOpen((o) => !o)
  }

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
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded text-gym-gray hover:text-white hover:bg-white/5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-sm font-semibold">{CAL_MESES[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded text-gym-gray hover:text-white hover:bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {CAL_DOW.map((d) => (
              <div key={d} className="text-center text-gym-gray text-xs py-0.5">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { if (d) { onChange(toISO(d)); setOpen(false) } }}
                className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors
                  ${!d ? '' : isSelected(d) ? 'bg-gym-red text-white font-bold' : 'text-white hover:bg-white/10'}`}
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

const TOTALES_PAGO = { inscripcion_mensual: 30, solo_mensual: 25, solo_diario: 3, solo_inscripcion: 5, sin_pago: 0 }

function calcularDescuentoPromo(promo, baseTotal) {
  if (!promo) return 0
  if (promo.tipo === 'porcentaje') return parseFloat(((baseTotal * promo.valor) / 100).toFixed(2))
  if (promo.tipo === 'precio_fijo') return parseFloat(Math.max(0, baseTotal - promo.valor).toFixed(2))
  if (promo.tipo === 'combo') return parseFloat(Math.max(0, baseTotal - promo.valor).toFixed(2))
  return 0 // 2x1 no aplica descuento en efectivo
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
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('pagos')
  const [highlightId, setHighlightId] = useState(null)
  const [partialPaymentAmount, setPartialPaymentAmount] = useState('')
  const [loadingPartialPayment, setLoadingPartialPayment] = useState(false)
  const [cuotasCliente, setCuotasCliente] = useState([])
  const [showAbonosModal, setShowAbonosModal] = useState(false)
  const [dupErrors, setDupErrors] = useState({ email: null, telefono: null })
  const [membershipsMap, setMembershipsMap] = useState({})
  const [promociones, setPromociones] = useState([])
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(null)
  const [confirmDeletePago, setConfirmDeletePago] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const { register, handleSubmit, reset, control, watch, getValues, setValue, formState: { errors } } = useForm({
    defaultValues: { fechaInscripcion: fechaHoy(), tipoPago: 'inscripcion_mensual', descuento: 0, promocion_id: '' }
  })

  const editForm = useForm({
    defaultValues: { nombre: '', apellido: '', email: '', telefono: '' }
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editDupErrors, setEditDupErrors] = useState({ email: null, telefono: null })

  const fechaInscripcionWatch = watch('fechaInscripcion')
  const tipoPagoWatch = watch('tipoPago')
  const descuentoWatch = watch('descuento')
  const promocionIdWatch = watch('promocion_id')

  const baseTotal = TOTALES_PAGO[tipoPagoWatch] ?? 0
  const totalFinal = Math.max(0, baseTotal - (Number(descuentoWatch) || 0))

  useEffect(() => {
    fetchClients()
    supabase.from('promotions').select('id, nombre, tipo, valor').eq('activa', true)
      .then(({ data }) => setPromociones(data || []))
  }, [user])

  // Auto-calcular descuento cuando cambia la promoción o el tipo de pago
  useEffect(() => {
    const promo = promociones.find((p) => p.id === promocionIdWatch)
    const base = TOTALES_PAGO[tipoPagoWatch] ?? 0
    setValue('descuento', calcularDescuentoPromo(promo, base))
  }, [promocionIdWatch, tipoPagoWatch, promociones])

  // Fallback sin Realtime: Pagos dispara 'membership-updated' tras un pago mensual exitoso
  // → re-fetcha solo las membresías y actualiza el map
  useEffect(() => {
    const handler = async (e) => {
      const { client_id, fecha_vencimiento } = e.detail || {}
      console.log('[Clientes] membership-updated recibido:', { client_id, fecha_vencimiento })
      if (client_id && fecha_vencimiento) {
        // Actualización optimista inmediata
        setMembershipsMap((prev) => ({
          ...prev,
          [client_id]: { client_id, fecha_vencimiento, estado: 'activa' },
        }))
      }
      // Refetch completo de membresías como respaldo
      const { data } = await supabase
        .from('memberships')
        .select('client_id, fecha_vencimiento, estado')
        .order('fecha_vencimiento', { ascending: false })
      if (data) {
        const map = {}
        for (const m of data) { if (!map[m.client_id]) map[m.client_id] = m }
        setMembershipsMap(map)
      }
    }
    window.addEventListener('membership-updated', handler)
    return () => window.removeEventListener('membership-updated', handler)
  }, [])

  // Supabase Realtime (si está habilitado en el proyecto)
  useEffect(() => {
    const channel = supabase
      .channel('memberships-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships' }, (payload) => {
        const m = payload.new
        if (m?.client_id) {
          setMembershipsMap((prev) => ({
            ...prev,
            [m.client_id]: { client_id: m.client_id, fecha_vencimiento: m.fecha_vencimiento, estado: m.estado },
          }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

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
      supabase.from('clients').select('id, nombre, apellido, email, telefono, estado, fecha_inscripcion').order('fecha_inscripcion', { ascending: false }),
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

      // 3. SIEMPRE crear membresía (30 días desde la inscripción)
      const vencimiento = parseFechaLocal(fechaInscripcion)
      vencimiento.setDate(vencimiento.getDate() + 30)
      await supabase.from('memberships').insert({
        client_id: client.id,
        tipo: 'mensual',
        fecha_inicio: fechaInscripcion,
        fecha_vencimiento: formatFechaISO(vencimiento),
        estado: 'activa',
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

  const onUpdateClient = async (formData) => {
    setEditSaving(true)
    setEditDupErrors({ email: null, telefono: null })
    try {
      const telefonoNorm = formData.telefono ? normalizePhone(formData.telefono) : null

      // Check for duplicates (excluding the current client)
      const condiciones = [`email.eq.${formData.email}`]
      if (telefonoNorm) condiciones.push(`telefono.eq.${telefonoNorm}`)
      const { data: existentes } = await supabase
        .from('clients')
        .select('id, email, telefono')
        .or(condiciones.join(','))
        .neq('id', showPagos.id)

      if (existentes?.length > 0) {
        const newErrors = { email: null, telefono: null }
        for (const dup of existentes) {
          if (dup.email === formData.email) newErrors.email = 'Ya existe otro cliente con este correo'
          if (telefonoNorm && dup.telefono === telefonoNorm) newErrors.telefono = 'Ya existe otro cliente con este teléfono'
        }
        setEditDupErrors(newErrors)
        setEditSaving(false)
        return
      }

      const { error } = await supabase.from('clients').update({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: telefonoNorm,
      }).eq('id', showPagos.id)

      if (error) throw error

      toast.success('Cliente actualizado')
      const updated = { ...showPagos, nombre: formData.nombre, apellido: formData.apellido, email: formData.email, telefono: telefonoNorm }
      setShowPagos(updated)
      fetchClients()
    } catch {
      toast.error('Error al actualizar cliente')
    }
    setEditSaving(false)
  }

  const toggleEstado = async (client) => {
    const nuevoEstado = client.estado === 'activo' ? 'inactivo' : 'activo'
    const { error } = await supabase.from('clients').update({ estado: nuevoEstado }).eq('id', client.id)
    if (error) toast.error('Error al actualizar')
    else {
      toast.success(`Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`)
      if (showPagos?.id === client.id) setShowPagos((prev) => ({ ...prev, estado: nuevoEstado }))
      fetchClients()
    }
  }

  const verPagos = async (client, tab = 'info') => {
    setShowPagos(client)
    setActiveTab(tab)
    setEditDupErrors({ email: null, telefono: null })
    editForm.reset({
      nombre: client.nombre,
      apellido: client.apellido,
      email: client.email,
      telefono: client.telefono || '',
    })
    const [p, cuotas] = await Promise.all([
      supabase
        .from('payments')
        .select('id, client_id, tipo, monto, fecha_pago, notas, cuota_id, clients(id, nombre, apellido, email, telefono), promotions(nombre)')
        .eq('client_id', client.id)
        .order('fecha_pago', { ascending: false }),
      fetchCuotasCliente(client.id).catch(() => []),
    ])
    setPagos(p.data || [])
    setCuotasCliente(cuotas || [])
  }

  const addPartialPayment = async () => {
    if (!partialPaymentAmount || Number(partialPaymentAmount) <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    if (!showPagos) return

    setLoadingPartialPayment(true)
    try {
      const mes = mesHoy()
      let cuota = await getCuotaActivaPorMes(showPagos.id, mes)
      if (!cuota) {
        cuota = await crearCuota(showPagos.id, mes)
      }
      await registrarAbono(cuota.id, Number(partialPaymentAmount), showPagos.id)
      toast.success(`Abono de $${Number(partialPaymentAmount).toFixed(2)} registrado`)
      setPartialPaymentAmount('')
      verPagos(showPagos)
    } catch (err) {
      toast.error(err.message || 'Error al registrar abono')
    }
    setLoadingPartialPayment(false)
  }

  const getMembershipStatus = (clientId) => {
    const m = membershipsMap[clientId]
    if (!m) return { label: 'Sin membresía', color: 'bg-gray-500/10 text-gray-400' }
    const hoy = parseFechaLocal(fechaHoy())
    const vence = parseFechaLocal(m.fecha_vencimiento)
    const diasRestantes = Math.max(0, Math.floor((vence - hoy) / 86400000))

    if (vence < hoy) {
      return { label: `❌ Vencida · ${formatearFecha(m.fecha_vencimiento, 'day')}`, color: 'bg-red-500/10 text-red-400' }
    }

    if (diasRestantes <= 7) {
      return {
        label: `⚠️ Vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
        color: 'bg-yellow-500/10 text-yellow-400'
      }
    }

    return {
      label: `✅ Activa · ${diasRestantes} días`,
      color: 'bg-green-500/10 text-green-400'
    }
  }

  const recalcularMembresiaTrasBorrado = async (clientId) => {
    const { data } = await supabase
      .from('payments')
      .select('fecha_pago')
      .eq('client_id', clientId)
      .eq('tipo', 'mensual')
      .order('fecha_pago', { ascending: false })
      .limit(1)

    if (data?.length > 0) {
      const vencimiento = parseFechaLocal(data[0].fecha_pago)
      vencimiento.setDate(vencimiento.getDate() + 30)
      const fechaVenc = formatFechaISO(vencimiento)
      await supabase
        .from('memberships')
        .update({ fecha_inicio: data[0].fecha_pago, fecha_vencimiento: fechaVenc, estado: 'activa' })
        .eq('client_id', clientId)
      window.dispatchEvent(new CustomEvent('membership-updated', {
        detail: { client_id: clientId, fecha_vencimiento: fechaVenc },
      }))
    } else {
      await supabase.from('memberships').delete().eq('client_id', clientId)
      setMembershipsMap((prev) => {
        const next = { ...prev }
        delete next[clientId]
        return next
      })
    }
  }

  const deleteClient = async (client) => {
    setDeletingId(client.id)
    try {
      await supabase.from('payments').delete().eq('client_id', client.id)
      await supabase.from('memberships').delete().eq('client_id', client.id)
      await supabase.from('cuotas').delete().eq('client_id', client.id)
      const { error } = await supabase.from('clients').delete().eq('id', client.id)
      if (error) throw error
      toast.success(`Cliente ${client.nombre} ${client.apellido} eliminado`)
      setConfirmDeleteClient(null)
      setShowPagos(null)
      fetchClients()
    } catch {
      toast.error('Error al eliminar cliente')
    }
    setDeletingId(null)
  }

  const deletePago = async (pago) => {
    setDeletingId(pago.id)
    try {
      const { error } = await supabase.from('payments').delete().eq('id', pago.id)
      if (error) throw error

      if (pago.cuota_id) {
        const { data: sumData } = await supabase
          .from('payments')
          .select('monto')
          .eq('cuota_id', pago.cuota_id)
        const totalPagado = (sumData || []).reduce((acc, p) => acc + Number(p.monto), 0)
        const { data: cuota } = await supabase
          .from('cuotas')
          .select('monto_total')
          .eq('id', pago.cuota_id)
          .single()
        const nuevoEstado = totalPagado >= (cuota?.monto_total ?? 25) ? 'pagada' : 'pendiente'
        await supabase
          .from('cuotas')
          .update({ monto_pagado: totalPagado, estado: nuevoEstado })
          .eq('id', pago.cuota_id)
      }

      if (pago.tipo === 'mensual') {
        await recalcularMembresiaTrasBorrado(pago.client_id)
      }

      toast.success('Pago eliminado')
      setConfirmDeletePago(null)
      verPagos(showPagos)
    } catch {
      toast.error('Error al eliminar pago')
    }
    setDeletingId(null)
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
                      onClick={() => verPagos(client)}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-all ${
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
                      <td className="px-4 sm:px-6 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button onClick={(e) => { e.stopPropagation(); verPagos(client, 'pagos') }} className="p-1.5 text-gym-gray hover:text-white btn-icon" title="Ver pagos">
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); toggleEstado(client) }} className="p-1.5 text-gym-gray hover:text-white btn-icon" title="Cambiar estado">
                            {client.estado === 'activo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClient(client) }} className="p-1.5 text-gym-gray hover:text-red-400 btn-icon" title="Eliminar cliente">
                            <Trash2 className="w-4 h-4" />
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
                  <div key={client.id} id={`row-${client.id}`} onClick={() => verPagos(client)} className={`bg-gym-black rounded-lg p-3 space-y-2 cursor-pointer ${client.id === highlightId ? 'border-2 border-gym-red' : 'border border-white/5'}`}>
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
                      <button onClick={(e) => { e.stopPropagation(); verPagos(client, 'pagos') }} className="flex-1 p-2 text-xs text-gym-gray hover:text-white hover:bg-white/5 rounded btn-icon flex items-center justify-center gap-1" title="Ver pagos">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pagos</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleEstado(client) }} className="flex-1 p-2 text-xs text-gym-gray hover:text-white hover:bg-white/5 rounded btn-icon flex items-center justify-center gap-1" title="Cambiar estado">
                        {client.estado === 'activo' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{client.estado === 'activo' ? 'Desactivar' : 'Activar'}</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClient(client) }} className="p-2 text-xs text-gym-gray hover:text-red-400 hover:bg-red-500/5 rounded btn-icon flex items-center justify-center" title="Eliminar cliente">
                        <Trash2 className="w-3.5 h-3.5" />
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
                <CalendarPicker
                  value={fechaInscripcionWatch || fechaHoy()}
                  onChange={(v) => setValue('fechaInscripcion', v)}
                />
              </div>

              {/* Membership Expiration Info */}
              {(() => {
                const fecha = fechaInscripcionWatch || fechaHoy()
                const vencimiento = parseFechaLocal(fecha)
                vencimiento.setDate(vencimiento.getDate() + 30)
                const diasRestantes = Math.max(0, Math.floor((vencimiento - parseFechaLocal(fechaHoy())) / 86400000))
                return (
                  <div className="bg-gym-red/10 border border-gym-red/30 rounded-lg p-3">
                    <p className="text-gym-gray text-xs font-semibold uppercase tracking-wider mb-1">Membresía</p>
                    <p className="text-white font-bold text-sm">Vence en 30 días</p>
                    <p className="text-gym-red text-xs mt-1">{formatearFecha(formatFechaISO(vencimiento), 'long')}</p>
                    <p className="text-gym-gray text-xs mt-2">({diasRestantes} días restantes)</p>
                  </div>
                )
              })()}

              {/* Promoción */}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Promoción (opcional)</label>
                <select
                  {...register('promocion_id')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                >
                  <option value="">Sin promoción</option>
                  {promociones.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
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
                {saving
                  ? 'Registrando...'
                  : tipoPagoWatch === 'sin_pago'
                  ? 'Registrar cliente'
                  : `Registrar cliente — $${totalFinal.toFixed(2)}`}
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
                ['info', '👤 Información'],
                ['pagos', '💳 Pagos'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg nav-interactive ${
                    activeTab === tab ? 'bg-gym-red text-white' : 'text-gym-gray hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Info / Edit Tab */}
            {activeTab === 'info' && (
              <form onSubmit={editForm.handleSubmit(onUpdateClient)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gym-gray text-xs mb-1">Nombre</label>
                    <input
                      {...editForm.register('nombre', { required: true })}
                      className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    />
                  </div>
                  <div>
                    <label className="block text-gym-gray text-xs mb-1">Apellido</label>
                    <input
                      {...editForm.register('apellido', { required: true })}
                      className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gym-gray text-xs mb-1">Correo electrónico</label>
                  <input
                    {...editForm.register('email', {
                      required: true,
                      onChange: () => setEditDupErrors((p) => ({ ...p, email: null })),
                    })}
                    type="email"
                    className={`w-full bg-gym-black border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red ${editDupErrors.email ? 'border-red-500' : 'border-white/10'}`}
                  />
                  {editDupErrors.email && <p className="text-red-400 text-xs mt-1">{editDupErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-gym-gray text-xs mb-1">Teléfono</label>
                  <Controller
                    name="telefono"
                    control={editForm.control}
                    rules={{
                      validate: (v) => {
                        if (!v || v.trim() === '') return true
                        const normalized = normalizePhone(v)
                        return isValidPhoneNumber(normalized)
                          ? true
                          : 'Número inválido. Ej: 0998020967 o +593998020967'
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <PhoneInputWithCode
                        field={{
                          ...field,
                          onChange: (v) => { field.onChange(v); setEditDupErrors((p) => ({ ...p, telefono: null })) },
                        }}
                        error={fieldState.error?.message || editDupErrors.telefono}
                      />
                    )}
                  />
                </div>

                <div className="flex items-center justify-between bg-gym-black border border-white/10 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-white text-sm font-semibold">Estado</p>
                    <p className="text-gym-gray text-xs mt-0.5">Activar o desactivar al cliente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEstado(showPagos)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                      showPagos?.estado === 'activo'
                        ? 'bg-green-500/10 text-green-400 hover:bg-red-500/10 hover:text-red-400'
                        : 'bg-red-500/10 text-red-400 hover:bg-green-500/10 hover:text-green-400'
                    }`}
                  >
                    {showPagos?.estado === 'activo' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    {showPagos?.estado === 'activo' ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-full flex items-center justify-center gap-2 bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-2.5 rounded-xl btn-interactive"
                >
                  <Save className="w-4 h-4" />
                  {editSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteClient(showPagos)}
                  className="w-full flex items-center justify-center gap-2 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar cliente
                </button>
              </form>
            )}

            {/* Pagos Tab */}
            {activeTab === 'pagos' && (
              <>
                {/* Cuotas con saldo pendiente */}
                {cuotasCliente.filter((c) => c.estado === 'pendiente').length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-gym-gray text-xs font-semibold uppercase">Cuotas con saldo pendiente</p>
                    {cuotasCliente.filter((c) => c.estado === 'pendiente').map((cuota) => (
                      <div key={cuota.id} className="bg-gym-black border border-gym-red/20 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-semibold capitalize">{cuota.mes_correspondiente}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                            Pendiente ${cuota.saldo_pendiente.toFixed(2)}
                          </span>
                        </div>
                        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="absolute left-0 top-0 h-full bg-gym-red rounded-full"
                            style={{ width: `${cuota.porcentaje}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gym-gray">
                          <span>${cuota.monto_pagado.toFixed(2)} pagado</span>
                          <span>${cuota.monto_total.toFixed(2)} total</span>
                        </div>
                        <button
                          onClick={() => setShowAbonosModal(true)}
                          className="w-full text-xs bg-gym-red/10 hover:bg-gym-red/20 text-gym-red font-bold py-1.5 rounded-lg transition-colors"
                        >
                          Registrar abono
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {pagos.length === 0 ? (
                  <p className="text-gym-gray text-center py-8">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-3">
                    {pagos.map((pago) => (
                      <div key={pago.id} className="bg-gym-black border border-white/5 rounded-xl p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-semibold capitalize">{pago.tipo}</span>
                            {pago.cuota_id && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-gym-gray">
                                ABONO
                              </span>
                            )}
                          </div>
                          <div className="text-gym-gray text-xs mt-0.5">
                            {formatearFecha(pago.fecha_pago)}
                            {pago.promotions && <span className="ml-2 text-gym-red">· {pago.promotions.nombre}</span>}
                          </div>
                          {pago.notas && <div className="text-gym-gray text-xs mt-0.5 italic">{pago.notas}</div>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-gym-red font-black text-lg">${Number(pago.monto).toFixed(2)}</div>
                          <button
                            onClick={() => setConfirmDeletePago(pago)}
                            className="p-1.5 text-gym-gray hover:text-red-400 btn-icon"
                            title="Eliminar pago"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sección de abonos */}
                <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                  <h4 className="text-white font-bold text-sm">Registrar Abono</h4>
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
                  <button
                    onClick={() => setShowAbonosModal(true)}
                    className="w-full text-xs text-gym-gray hover:text-white border border-white/5 hover:border-white/10 rounded-lg py-2 transition-colors"
                  >
                    Ver detalle de cuota y abonos
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {showAbonosModal && showPagos && (
        <AbonosModal
          client={showPagos}
          onClose={() => setShowAbonosModal(false)}
          onAbonoRegistrado={() => {
            setShowAbonosModal(false)
            verPagos(showPagos)
          }}
        />
      )}

      {/* Confirmación: eliminar cliente */}
      {confirmDeleteClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-base">Eliminar cliente</h3>
            </div>
            <p className="text-gym-gray text-sm mb-1">
              ¿Estás seguro de que quieres eliminar a{' '}
              <span className="text-white font-semibold">{confirmDeleteClient.nombre} {confirmDeleteClient.apellido}</span>?
            </p>
            <p className="text-red-400/80 text-xs mb-6">
              Se eliminarán también todos sus pagos, membresías y cuotas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteClient(null)}
                disabled={deletingId === confirmDeleteClient.id}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gym-gray hover:text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteClient(confirmDeleteClient)}
                disabled={deletingId === confirmDeleteClient.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === confirmDeleteClient.id ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Eliminando...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación: eliminar pago */}
      {confirmDeletePago && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-base">Eliminar pago</h3>
            </div>
            <p className="text-gym-gray text-sm mb-1">
              ¿Eliminar el pago de{' '}
              <span className="text-white font-semibold capitalize">{confirmDeletePago.tipo}</span>{' '}
              por <span className="text-gym-red font-bold">${Number(confirmDeletePago.monto).toFixed(2)}</span>?
            </p>
            {confirmDeletePago.tipo === 'mensual' && (
              <p className="text-yellow-400/80 text-xs mt-1 mb-4">
                La membresía se recalculará automáticamente desde el pago mensual anterior.
              </p>
            )}
            <p className="text-red-400/80 text-xs mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeletePago(null)}
                disabled={deletingId === confirmDeletePago.id}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gym-gray hover:text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deletePago(confirmDeletePago)}
                disabled={deletingId === confirmDeletePago.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId === confirmDeletePago.id ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Eliminando...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
