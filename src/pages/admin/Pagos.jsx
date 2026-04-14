import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, Filter, Clock, Zap, TrendingDown, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { fechaHoy, mesHoy, parseFechaLocal, formatFechaISO, formatearFecha, formatearFechaObj } from '../../lib/dates'
import { fetchCuotasPendientes } from '../../lib/cuotas'
import AbonosModal from '../../components/admin/AbonosModal'


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
  const [cobrosPendientes, setCobrosPendientes] = useState([])
  const [cuotasPendientes, setCuotasPendientes] = useState([])
  const [abonosClient, setAbonosClient] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [clienteEstado, setClienteEstado] = useState(null)
  const [checkingCliente, setCheckingCliente] = useState(false)
  const [confirmDeletePago, setConfirmDeletePago] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { tipo: 'mensual', precio_diario: 3, descuento: 0 }
  })

  const tipoWatch = watch('tipo')
  const promoWatch = watch('promocion_id')
  const precioDiario = watch('precio_diario')
  const clientWatch = watch('client_id')
  const descuentoWatch = watch('descuento')

  const descuento = Math.max(0, Number(descuentoWatch) || 0)
  const montoFinal = Math.max(0, montoCalculado - descuento)
  const descuentoError = descuento > montoCalculado

  useEffect(() => { fetchAll({ showSpinner: true }) }, [user])

  useEffect(() => {
    let base = PRECIOS_BASE[tipoWatch] ?? Number(precioDiario) ?? 3
    if (tipoWatch === 'diario') base = Number(precioDiario) || 3
    const promo = promociones.find((p) => p.id === promoWatch)
    setSelectedPromo(promo || null)
    setMontoCalculado(calcularMonto(tipoWatch, promo, base))
    setValue('descuento', 0)
  }, [tipoWatch, promoWatch, precioDiario, promociones])

  useEffect(() => {
    if (!clientWatch) { setClienteEstado(null); return }
    verificarCliente(clientWatch)
  }, [clientWatch])

  // Auto-reset tipo if current selection becomes blocked after client change
  useEffect(() => {
    if (!clienteEstado) return
    const blocked = {
      mensual: clienteEstado.bloqueoMensual,
      diario: clienteEstado.bloqueoMensual,
      inscripcion: clienteEstado.tieneInscripcion,
    }
    if (blocked[tipoWatch]) {
      const first = ['mensual', 'diario', 'inscripcion'].find((t) => !blocked[t])
      if (first) setValue('tipo', first)
    }
  }, [clienteEstado])

  const verificarCliente = async (clientId) => {
    setCheckingCliente(true)
    const [mensualRes, inscripcionRes] = await Promise.all([
      supabase
        .from('payments')
        .select('fecha_pago')
        .eq('client_id', clientId)
        .eq('tipo', 'mensual')
        .order('fecha_pago', { ascending: false })
        .limit(1),
      supabase
        .from('payments')
        .select('id')
        .eq('client_id', clientId)
        .eq('tipo', 'inscripcion')
        .limit(1),
    ])

    const tieneInscripcion = (inscripcionRes.data?.length ?? 0) > 0

    let bloqueoMensual = false
    let fechaVencimiento = null
    let fechaRenovacion = null

    if (mensualRes.data?.length > 0) {
      const ultimoMensual = parseFechaLocal(mensualRes.data[0].fecha_pago)

      fechaVencimiento = new Date(ultimoMensual)
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 30)

      fechaRenovacion = new Date(fechaVencimiento)
      fechaRenovacion.setDate(fechaRenovacion.getDate() - 10)

      const hoy = parseFechaLocal(fechaHoy())

      bloqueoMensual = hoy < fechaRenovacion
    }

    setClienteEstado({ tieneInscripcion, bloqueoMensual, fechaVencimiento, fechaRenovacion })
    setCheckingCliente(false)
  }

  const fetchAll = async ({ showSpinner = false } = {}) => {
    if (showSpinner) setLoading(true)

    const hoyDate = parseFechaLocal(fechaHoy())
    const ventanaFin = new Date(hoyDate)
    ventanaFin.setDate(ventanaFin.getDate() + 10)
    const ventanaInicio = new Date(hoyDate)
    ventanaInicio.setDate(ventanaInicio.getDate() - 5) // incluir hasta 5 días vencidos

    const [pagosRes, clientesRes, promosRes, membresíasRes, cuotasRes] = await Promise.all([
      supabase.from('payments').select('id, client_id, tipo, monto, fecha_pago, notas, cuota_id, clients(id, nombre, apellido, email, telefono), promotions(nombre)').order('fecha_pago', { ascending: false }).order('id', { ascending: false }),
      supabase.from('clients').select('id, nombre, apellido').eq('estado', 'activo'),
      supabase.from('promotions').select('id, nombre, tipo, valor, activa').eq('activa', true),
      supabase.from('memberships')
        .select('client_id, fecha_vencimiento, clients(id, nombre, apellido)')
        .gte('fecha_vencimiento', formatFechaISO(ventanaInicio))
        .lte('fecha_vencimiento', formatFechaISO(ventanaFin)),
      fetchCuotasPendientes().catch(() => []),
    ])

    setPagos(pagosRes.data || [])
    setClientes(clientesRes.data || [])
    setPromociones(promosRes.data || [])
    setCobrosPendientes(membresíasRes.data || [])
    setCuotasPendientes(cuotasRes || [])
    if (showSpinner) setLoading(false)
  }

  const onSubmit = async (formData) => {
    setSaving(true)
    try {
      // Validaciones de bloqueo antes de llegar a Supabase
      if (clienteEstado?.tieneInscripcion && formData.tipo === 'inscripcion') {
        toast.error('No se puede registrar este pago. Este cliente ya tiene inscripción registrada.')
        setSaving(false)
        return
      }
      if (clienteEstado?.bloqueoMensual && formData.tipo === 'mensual') {
        const fechaVenc = format(clienteEstado.fechaVencimiento, 'dd MMM yyyy', { locale: es })
        toast.error(`No se puede registrar este pago. Mensualidad activa hasta el ${fechaVenc}.`)
        setSaving(false)
        return
      }
      if (clienteEstado?.bloqueoMensual && formData.tipo === 'diario') {
        const fechaVenc = format(clienteEstado.fechaVencimiento, 'dd MMM yyyy', { locale: es })
        toast.error(`Este cliente tiene una mensualidad activa hasta el ${fechaVenc}. No requiere pago diario.`)
        setSaving(false)
        return
      }

      const desc = Math.max(0, Number(formData.descuento) || 0)
      if (desc > montoCalculado) {
        toast.error('El descuento no puede ser mayor al monto total')
        setSaving(false)
        return
      }

      const promo = promociones.find((p) => p.id === formData.promocion_id)
      let base = PRECIOS_BASE[formData.tipo] ?? 3
      if (formData.tipo === 'diario') base = Number(formData.precio_diario) || 3
      const montoOriginal = calcularMonto(formData.tipo, promo, base)
      const monto = Math.max(0, montoOriginal - desc)
      const today = fechaHoy()

      // El descuento se refleja en 'notas' — la tabla payments no tiene columna 'descuento'
      const notasDescuento = desc > 0
        ? `${formData.tipo.charAt(0).toUpperCase() + formData.tipo.slice(1)} $${montoOriginal.toFixed(2)} — desc. -$${desc.toFixed(2)} → cobra $${monto.toFixed(2)}`
        : null
      const notasFinales = [notasDescuento, formData.notas || null].filter(Boolean).join(' | ') || null

      const { data: nuevoPago, error: pagoError } = await supabase
        .from('payments')
        .insert({
          client_id: formData.client_id,
          tipo: formData.tipo,
          monto,
          fecha_pago: today,
          mes_correspondiente: mesHoy(),
          promocion_id: formData.promocion_id || null,
          notas: notasFinales,
        })
        .select('id, client_id, tipo, monto, fecha_pago, notas, clients(id, nombre, apellido, email, telefono), promotions(nombre)')
        .single()

      if (pagoError) throw pagoError

      if (formData.tipo === 'mensual') {
        const vencimiento = parseFechaLocal(today)
        vencimiento.setDate(vencimiento.getDate() + 30)
        const fechaVenc = formatFechaISO(vencimiento)

        console.log('[Pagos] Actualizando membresía:', { client_id: formData.client_id, fecha_vencimiento: fechaVenc })

        // UPDATE primero — más confiable que upsert sin constraint UNIQUE garantizado
        const { data: updData, error: updError } = await supabase
          .from('memberships')
          .update({ fecha_inicio: today, fecha_vencimiento: fechaVenc, estado: 'activa' })
          .eq('client_id', formData.client_id)
          .select()

        console.log('[Pagos] UPDATE memberships result:', { data: updData, error: updError })

        if (updError) throw updError

        // Si no había fila previa, INSERT
        if (!updData || updData.length === 0) {
          console.log('[Pagos] Sin fila previa → INSERT memberships')
          const { data: insData, error: insError } = await supabase
            .from('memberships')
            .insert({ client_id: formData.client_id, tipo: 'mensual', fecha_inicio: today, fecha_vencimiento: fechaVenc, estado: 'activa' })
            .select()
          console.log('[Pagos] INSERT memberships result:', { data: insData, error: insError })
          if (insError) throw insError
        }

        // Notificar a Clientes (fallback sin Realtime)
        window.dispatchEvent(new CustomEvent('membership-updated', {
          detail: { client_id: formData.client_id, fecha_vencimiento: fechaVenc },
        }))
      }

      // Insertar el nuevo pago al tope de la tabla inmediatamente (sin spinner)
      setPagos((prev) => [nuevoPago, ...prev])

      toast.success(`Pago registrado — $${monto.toFixed(2)}${desc > 0 ? ` (desc. $${desc.toFixed(2)})` : ''}`)
      reset()
      setShowModal(false)

      // Sincronización completa en background (sin bloquear UI)
      fetchAll()
    } catch (err) {
      console.error('[Pagos] Error al registrar pago:', err)
      toast.error(`Error al registrar pago${err?.message ? `: ${err.message}` : ''}`)
    }
    setSaving(false)
  }

  const abrirCobroRapido = (clientId) => {
    reset()
    setValue('client_id', clientId)
    setValue('tipo', 'mensual')
    setShowModal(true)
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
        const clientId = pago.client_id
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
          window.dispatchEvent(new CustomEvent('membership-updated', {
            detail: { client_id: clientId, fecha_vencimiento: null },
          }))
        }
      }

      toast.success('Pago eliminado')
      setConfirmDeletePago(null)
      fetchAll()
    } catch {
      toast.error('Error al eliminar pago')
    }
    setDeletingId(null)
  }

  const filtrados = filtroTipo ? pagos.filter((p) => p.tipo === filtroTipo) : pagos

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Pagos</h2>
          <p className="text-gym-gray text-xs sm:text-sm mt-1">{pagos.length} registros</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl btn-interactive text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Registrar pago</span>
          <span className="sm:hidden">Pago</span>
        </button>
      </div>

      {/* Cobros pendientes */}
      {cobrosPendientes.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-yellow-500/10">
            <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-400 font-semibold text-sm">
              Cobros pendientes ({cobrosPendientes.length})
            </span>
            <span className="text-yellow-400/50 text-xs">— membresías por vencer o vencidas</span>
          </div>

          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-yellow-500/10">
                  <th className="text-left px-6 py-3 text-yellow-400/60 text-xs font-semibold uppercase">Cliente</th>
                  <th className="text-left px-6 py-3 text-yellow-400/60 text-xs font-semibold uppercase">Vence</th>
                  <th className="text-left px-6 py-3 text-yellow-400/60 text-xs font-semibold uppercase">Estado</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {cobrosPendientes.map((m) => {
                  const hoy = parseFechaLocal(fechaHoy())
                  const venc = parseFechaLocal(m.fecha_vencimiento)
                  const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
                  const vencido = diasRestantes < 0
                  return (
                    <tr key={m.client_id} className="border-b border-yellow-500/5 hover:bg-yellow-500/5 transition-colors">
                      <td className="px-6 py-3 text-white text-sm font-medium">
                        {m.clients ? `${m.clients.nombre} ${m.clients.apellido}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={vencido ? 'text-red-400' : 'text-yellow-300'}>
                          {formatearFecha(m.fecha_vencimiento)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {vencido ? (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                            Vencida hace {Math.abs(diasRestantes)}d
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400">
                            Vence en {diasRestantes}d
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => abrirCobroRapido(m.client_id)}
                          className="flex items-center gap-1.5 ml-auto bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          Cobrar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-2 p-3">
            {cobrosPendientes.map((m) => {
              const hoy = parseFechaLocal(fechaHoy())
              const venc = parseFechaLocal(m.fecha_vencimiento)
              const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24))
              const vencido = diasRestantes < 0
              return (
                <div key={m.client_id} className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white text-sm font-semibold truncate">
                      {m.clients ? `${m.clients.nombre} ${m.clients.apellido}` : '—'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${vencido ? 'text-red-400' : 'text-yellow-300'}`}>
                        {formatearFecha(m.fecha_vencimiento)}
                      </span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${vencido ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        {vencido ? `Venc. hace ${Math.abs(diasRestantes)}d` : `${diasRestantes}d`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirCobroRapido(m.client_id)}
                    className="flex-shrink-0 flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    Cobrar
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Saldos pendientes (cuotas con abonos incompletos) */}
      {cuotasPendientes.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-red-500/10">
            <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 font-semibold text-sm">
              Saldos pendientes ({cuotasPendientes.length})
            </span>
            <span className="text-red-400/50 text-xs">— clientes con mensualidad incompleta</span>
          </div>

          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-500/10">
                  <th className="text-left px-6 py-3 text-red-400/60 text-xs font-semibold uppercase">Cliente</th>
                  <th className="text-left px-6 py-3 text-red-400/60 text-xs font-semibold uppercase">Mes</th>
                  <th className="text-left px-6 py-3 text-red-400/60 text-xs font-semibold uppercase">Progreso</th>
                  <th className="text-left px-6 py-3 text-red-400/60 text-xs font-semibold uppercase">Pendiente</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {cuotasPendientes.map((c) => (
                  <tr key={c.id} className="border-b border-red-500/5 hover:bg-red-500/5 transition-colors">
                    <td className="px-6 py-3 text-white text-sm font-medium">
                      {c.clients ? `${c.clients.nombre} ${c.clients.apellido}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-gym-gray text-sm">{c.mes_correspondiente}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="absolute left-0 top-0 h-full bg-gym-red rounded-full" style={{ width: `${c.porcentaje}%` }} />
                        </div>
                        <span className="text-gym-gray text-xs">{c.porcentaje}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                        ${c.saldo_pendiente.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setAbonosClient(c.clients ? { id: c.client_id, ...c.clients } : null)}
                        className="flex items-center gap-1.5 ml-auto bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <TrendingDown className="w-3 h-3" />
                        Abonar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-2 p-3">
            {cuotasPendientes.map((c) => (
              <div key={c.id} className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-semibold truncate">
                    {c.clients ? `${c.clients.nombre} ${c.clients.apellido}` : '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="relative w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-gym-red rounded-full" style={{ width: `${c.porcentaje}%` }} />
                    </div>
                    <span className="text-xs text-red-400 font-semibold">${c.saldo_pendiente.toFixed(2)} pend.</span>
                  </div>
                </div>
                <button
                  onClick={() => setAbonosClient(c.clients ? { id: c.client_id, ...c.clients } : null)}
                  className="flex-shrink-0 flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  <TrendingDown className="w-3 h-3" />
                  Abonar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gym-gray flex-shrink-0" />
        <div className="flex gap-2 overflow-x-auto">
          {['', 'mensual', 'diario', 'inscripcion'].map((tipo) => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium nav-interactive whitespace-nowrap flex-shrink-0 ${filtroTipo === tipo ? 'bg-gym-red text-white' : 'bg-gym-dark text-gym-gray hover:text-white'}`}
            >
              {tipo === '' ? 'Todos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="bg-gym-dark border border-white/5 rounded-xl sm:rounded-2xl overflow-hidden">
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
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase">Cliente</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase">Tipo</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase">Monto</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase">Fecha</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase">Promoción</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase">Notas</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((pago) => (
                    <tr key={pago.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-white text-xs sm:text-sm font-medium">
                        {pago.clients ? `${pago.clients.nombre} ${pago.clients.apellido}` : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full capitalize ${
                            pago.tipo === 'mensual' ? 'bg-blue-500/10 text-blue-400' :
                            pago.tipo === 'diario' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-green-500/10 text-green-400'
                          }`}>
                            {pago.tipo}
                          </span>
                          {pago.cuota_id && (
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-gym-gray">
                              ABONO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-red font-black text-sm sm:text-base">${Number(pago.monto).toFixed(2)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs sm:text-sm">
                        {format(parseFechaLocal(pago.fecha_pago), 'dd MMM yyyy', { locale: es })}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs sm:text-sm">
                        {pago.promotions?.nombre || '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs sm:text-sm">{pago.notas || '—'}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <button
                          onClick={() => setConfirmDeletePago(pago)}
                          className="p-1.5 text-gym-gray hover:text-red-400 btn-icon"
                          title="Eliminar pago"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 sm:py-12 text-gym-gray text-sm">Sin pagos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2 p-3">
              {filtrados.map((pago) => (
                <div key={pago.id} className="bg-gym-black rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white text-sm font-semibold">
                        {pago.clients ? `${pago.clients.nombre} ${pago.clients.apellido}` : '—'}
                      </div>
                      <div className="text-gym-gray text-xs mt-1">
                        {format(parseFechaLocal(pago.fecha_pago), 'dd MMM yyyy', { locale: es })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize whitespace-nowrap ${
                        pago.tipo === 'mensual' ? 'bg-blue-500/10 text-blue-400' :
                        pago.tipo === 'diario' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-green-500/10 text-green-400'
                      }`}>
                        {pago.tipo}
                      </span>
                      <button
                        onClick={() => setConfirmDeletePago(pago)}
                        className="p-1 text-gym-gray hover:text-red-400 btn-icon"
                        title="Eliminar pago"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gym-gray">Monto</div>
                    <div className="text-gym-red font-black">${Number(pago.monto).toFixed(2)}</div>
                  </div>
                  {pago.promotions?.nombre && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gym-gray">Promoción</div>
                      <div className="text-xs text-white">{pago.promotions.nombre}</div>
                    </div>
                  )}
                  {pago.notas && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gym-gray">Notas</div>
                      <div className="text-xs text-white">{pago.notas}</div>
                    </div>
                  )}
                </div>
              ))}
              {filtrados.length === 0 && (
                <div className="text-center py-8 text-gym-gray text-sm">Sin pagos registrados</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Registrar Pago</h3>
              <button onClick={() => { setShowModal(false); reset(); setClienteEstado(null) }} className="text-gym-gray hover:text-white btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-gym-gray text-xs mb-1">Cliente</label>
                <div className="relative">
                  <select {...register('client_id', { required: true })}
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red">
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                    ))}
                  </select>
                  {checkingCliente && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-gym-red border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Aviso estado mensualidad */}
                {clienteEstado && !checkingCliente && (
                  <>
                    {clienteEstado.bloqueoMensual && (
                      <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5 text-yellow-400 text-xs leading-relaxed">
                        ⚠️ Mensualidad activa hasta el{' '}
                        <span className="font-bold">{format(clienteEstado.fechaVencimiento, 'dd MMM yyyy', { locale: es })}</span>.
                        {' '}Podrás renovar a partir del{' '}
                        <span className="font-bold">{format(clienteEstado.fechaRenovacion, 'dd MMM yyyy', { locale: es })}</span>.
                      </div>
                    )}
                    {!clienteEstado.bloqueoMensual && clienteEstado.fechaVencimiento && (
                      <div className="mt-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2.5 text-green-400 text-xs">
                        ✅ Renovación disponible. Vence el{' '}
                        <span className="font-bold">{format(clienteEstado.fechaVencimiento, 'dd MMM yyyy', { locale: es })}</span>.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-gym-gray text-xs mb-1">Tipo de pago</label>
                <select {...register('tipo')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red">
                  <option value="mensual">Mensual — $25</option>
                  <option value="diario" disabled={clienteEstado?.bloqueoMensual}>
                    Diario{clienteEstado?.bloqueoMensual ? ' (mensual activo)' : ''}
                  </option>
                  <option value="inscripcion" disabled={clienteEstado?.tieneInscripcion}>
                    Inscripción — $5{clienteEstado?.tieneInscripcion ? ' (ya pagado)' : ''}
                  </option>
                </select>
                {clienteEstado?.tieneInscripcion && tipoWatch === 'inscripcion' && (
                  <p className="text-gym-gray text-xs mt-1">
                    Este cliente ya tiene inscripción registrada.
                  </p>
                )}
                {clienteEstado?.bloqueoMensual && tipoWatch === 'diario' && (
                  <p className="text-red-400 text-xs mt-1">
                    Este cliente tiene una mensualidad activa hasta el{' '}
                    <span className="font-bold">{format(clienteEstado.fechaVencimiento, 'dd MMM yyyy', { locale: es })}</span>.
                    {' '}No requiere pago diario.
                  </p>
                )}
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
                <label className="block text-gym-gray text-xs mb-1">Descuento ($)</label>
                <input
                  {...register('descuento')}
                  type="number"
                  step="0.01"
                  min="0"
                  className={`w-full bg-gym-black border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none transition-colors ${descuentoError ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-gym-red'}`}
                  placeholder="0.00"
                />
                {descuentoError && (
                  <p className="text-red-400 text-xs mt-1">El descuento no puede ser mayor al monto total</p>
                )}
              </div>

              <div>
                <label className="block text-gym-gray text-xs mb-1">Notas (opcional)</label>
                <input {...register('notas')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                  placeholder="Observaciones..." />
              </div>

              {/* Resumen de pago */}
              <div className="bg-gym-black border border-gym-red/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gym-gray">Monto original</span>
                  <span className="text-white font-medium">
                    ${montoCalculado.toFixed(2)}
                    {selectedPromo && <span className="text-gym-red text-xs ml-1">({selectedPromo.nombre})</span>}
                  </span>
                </div>
                {descuento > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gym-gray">Descuento</span>
                    <span className="text-yellow-400 font-medium">−${descuento.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <span className="text-gym-gray text-xs font-semibold uppercase tracking-wide">Total a pagar</span>
                  <span className="text-gym-red text-2xl font-black">${montoFinal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  checkingCliente ||
                  descuentoError ||
                  (clienteEstado?.bloqueoMensual && tipoWatch === 'mensual') ||
                  (clienteEstado?.bloqueoMensual && tipoWatch === 'diario') ||
                  (clienteEstado?.tieneInscripcion && tipoWatch === 'inscripcion')
                }
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl btn-interactive"
              >
                {saving ? 'Guardando...' : checkingCliente ? 'Verificando...' : `Registrar — $${montoFinal.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {abonosClient && (
        <AbonosModal
          client={abonosClient}
          onClose={() => setAbonosClient(null)}
          onAbonoRegistrado={() => {
            setAbonosClient(null)
            fetchAll()
          }}
        />
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
              por <span className="text-gym-red font-bold">${Number(confirmDeletePago.monto).toFixed(2)}</span>
              {confirmDeletePago.clients && (
                <> de <span className="text-white font-semibold">{confirmDeletePago.clients.nombre} {confirmDeletePago.clients.apellido}</span></>
              )}?
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
