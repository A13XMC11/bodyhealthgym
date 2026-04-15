import { supabase } from './supabase'
import { fechaHoy, mesHoy, parseFechaLocal, formatFechaISO } from './dates'

/**
 * Obtener todas las cuotas pendientes, opcionalmente filtrando por cliente.
 * Retorna cuotas enriquecidas con saldo_pendiente y porcentaje pagado.
 */
export async function fetchCuotasPendientes(clientId = null) {
  let query = supabase
    .from('cuotas')
    .select('id, client_id, mes_correspondiente, monto_total, monto_pagado, estado, fecha_creacion, notas, clients(id, nombre, apellido)')
    .eq('estado', 'pendiente')
    .order('fecha_creacion', { ascending: false })

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map(enriquecerCuota)
}

/**
 * Obtener todas las cuotas de un cliente (pendientes y pagadas).
 */
export async function fetchCuotasCliente(clientId) {
  const { data, error } = await supabase
    .from('cuotas')
    .select('id, client_id, mes_correspondiente, monto_total, monto_pagado, estado, fecha_creacion, notas')
    .eq('client_id', clientId)
    .order('fecha_creacion', { ascending: false })

  if (error) throw error
  return (data || []).map(enriquecerCuota)
}

/**
 * Buscar la cuota activa (pendiente) para un cliente en el mes dado.
 * Retorna null si no existe.
 */
export async function getCuotaActivaPorMes(clientId, mes) {
  const { data, error } = await supabase
    .from('cuotas')
    .select('id, client_id, mes_correspondiente, monto_total, monto_pagado, estado, fecha_creacion, notas')
    .eq('client_id', clientId)
    .eq('mes_correspondiente', mes)
    .eq('estado', 'pendiente')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? enriquecerCuota(data) : null
}

/**
 * Crear una nueva cuota para un cliente.
 */
export async function crearCuota(clientId, mes, montoTotal = 25, notas = null) {
  const { data, error } = await supabase
    .from('cuotas')
    .insert({
      client_id: clientId,
      mes_correspondiente: mes,
      monto_total: montoTotal,
      notas,
    })
    .select()
    .single()

  if (error) throw error
  return enriquecerCuota(data)
}

/**
 * Registrar un abono hacia una cuota.
 * - Inserta el pago en payments (tipo='mensual', cuota_id=cuotaId)
 * - Recalcula monto_pagado sumando todos los abonos
 * - Si monto_pagado >= monto_total: marca cuota 'pagada' y extiende membresía
 * Retorna { pago, cuota, membresia }
 */
export async function registrarAbono(cuotaId, monto, clientId, notas = null) {
  const today = fechaHoy()
  const mes = mesHoy()

  // 1. Insertar el pago vinculado a la cuota
  const { data: pago, error: pagoError } = await supabase
    .from('payments')
    .insert({
      client_id: clientId,
      tipo: 'mensual',
      monto: Number(monto),
      fecha_pago: today,
      mes_correspondiente: mes,
      cuota_id: cuotaId,
      notas: notas || `Abono $${Number(monto).toFixed(2)}`,
    })
    .select('id, client_id, tipo, monto, fecha_pago, notas, cuota_id, clients(id, nombre, apellido, email, telefono)')
    .single()

  if (pagoError) throw pagoError

  // 2. Recalcular monto_pagado sumando todos los abonos de esta cuota
  const { data: sumData, error: sumError } = await supabase
    .from('payments')
    .select('monto')
    .eq('cuota_id', cuotaId)

  if (sumError) throw sumError

  const totalPagado = (sumData || []).reduce((acc, p) => acc + Number(p.monto), 0)

  // 3. Actualizar monto_pagado en la cuota
  const { data: cuotaActualizada, error: cuotaError } = await supabase
    .from('cuotas')
    .update({ monto_pagado: totalPagado })
    .eq('id', cuotaId)
    .select()
    .single()

  if (cuotaError) throw cuotaError

  // 4. Si el total pagado cubre el total requerido, marcar como pagada y extender membresía
  let membresia = null
  if (totalPagado >= cuotaActualizada.monto_total) {
    const { error: estadoError } = await supabase
      .from('cuotas')
      .update({ estado: 'pagada' })
      .eq('id', cuotaId)

    if (estadoError) throw estadoError

    membresia = await extenderMembresia(clientId, today)
    cuotaActualizada.estado = 'pagada'
  }

  return { pago, cuota: enriquecerCuota(cuotaActualizada), membresia }
}

/**
 * Extender la membresía de un cliente +30 días desde fechaDesde.
 * Hace UPDATE primero; si no existe la fila, hace INSERT.
 * Despacha el evento 'membership-updated' para sincronizar Clientes.
 */
export async function extenderMembresia(clientId, fechaDesde) {
  const vencimiento = parseFechaLocal(fechaDesde)
  vencimiento.setDate(vencimiento.getDate() + 30)
  const fechaVenc = formatFechaISO(vencimiento)

  const { data: updData, error: updError } = await supabase
    .from('memberships')
    .update({ fecha_inicio: fechaDesde, fecha_vencimiento: fechaVenc, estado: 'activa' })
    .eq('client_id', clientId)
    .select()

  if (updError) throw updError

  if (!updData || updData.length === 0) {
    const { error: insError } = await supabase
      .from('memberships')
      .insert({ client_id: clientId, tipo: 'mensual', fecha_inicio: fechaDesde, fecha_vencimiento: fechaVenc, estado: 'activa' })

    if (insError) throw insError
  }

  window.dispatchEvent(new CustomEvent('membership-updated', {
    detail: { client_id: clientId, fecha_vencimiento: fechaVenc },
  }))

  return { fechaVencimiento: fechaVenc }
}

/**
 * Obtener los abonos (payments) vinculados a una cuota específica.
 */
export async function fetchAbonosDeCuota(cuotaId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, monto, fecha_pago, notas')
    .eq('cuota_id', cuotaId)
    .order('fecha_pago', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Eliminar un abono (payment) de una cuota.
 * - Elimina el payment de la base de datos
 * - Recalcula monto_pagado de la cuota
 * - Si no hay más abonos, elimina la cuota
 * - Si la cuota estaba pagada, la marca como pendiente nuevamente
 * - Si es necesario, revierte la extensión de membresía
 */
export async function deleteAbono(abonoId, cuotaId, clientId) {
  // 1. Eliminar el abono
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('id', abonoId)

  if (deleteError) throw deleteError

  // 2. Recalcular monto_pagado sumando abonos restantes
  const { data: sumData } = await supabase
    .from('payments')
    .select('monto')
    .eq('cuota_id', cuotaId)

  const totalPagado = (sumData || []).reduce((acc, p) => acc + Number(p.monto), 0)

  // 3. Si no hay más abonos, eliminar la cuota
  if (totalPagado === 0) {
    const { error: deleteQuotaError } = await supabase
      .from('cuotas')
      .delete()
      .eq('id', cuotaId)

    if (deleteQuotaError) throw deleteQuotaError

    // Revertir extensión de membresía si aplica
    const { data: membresia } = await supabase
      .from('memberships')
      .select('fecha_vencimiento')
      .eq('client_id', clientId)
      .maybeSingle()

    if (membresia && membresia.fecha_vencimiento) {
      const hoy = parseFechaLocal(fechaHoy())
      const vencimiento = parseFechaLocal(membresia.fecha_vencimiento)
      const diasDiferencia = Math.floor((vencimiento - hoy) / (1000 * 60 * 60 * 24))

      // Si la diferencia es aproximadamente 30 días (membresía reciente), la eliminamos
      if (diasDiferencia >= 25 && diasDiferencia <= 35) {
        await supabase.from('memberships').delete().eq('client_id', clientId)
        window.dispatchEvent(new CustomEvent('membership-updated', {
          detail: { client_id: clientId, fecha_vencimiento: null },
        }))
      }
    }
  } else {
    // 4. Si hay abonos restantes, actualizar monto_pagado
    const { data: cuota, error: updateError } = await supabase
      .from('cuotas')
      .update({ monto_pagado: totalPagado, estado: 'pendiente' })
      .eq('id', cuotaId)
      .select()
      .single()

    if (updateError) throw updateError
    return enriquecerCuota(cuota)
  }
}

// Helpers internos

function enriquecerCuota(cuota) {
  const pagado = Number(cuota.monto_pagado) || 0
  const total = Number(cuota.monto_total) || 25
  return {
    ...cuota,
    monto_pagado: pagado,
    monto_total: total,
    saldo_pendiente: Math.max(0, total - pagado),
    porcentaje: Math.min(100, Math.round((pagado / total) * 100)),
  }
}
