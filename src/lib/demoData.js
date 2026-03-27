import { format, subDays } from 'date-fns'

const today = new Date()

// Demo clients - 8 activos + 2 inactivos
export const demoClients = [
  { id: 'c1', nombre: 'Carlos', apellido: 'Mendoza', email: 'carlos@demo.com', telefono: '+50312345678', estado: 'activo', fecha_inscripcion: '2025-06-15' },
  { id: 'c2', nombre: 'Ana', apellido: 'García', email: 'ana@demo.com', telefono: '+50312345679', estado: 'activo', fecha_inscripcion: '2025-08-20' },
  { id: 'c3', nombre: 'Pedro', apellido: 'López', email: 'pedro@demo.com', telefono: '+50312345680', estado: 'activo', fecha_inscripcion: '2025-07-10' },
  { id: 'c4', nombre: 'María', apellido: 'Sánchez', email: 'maria@demo.com', telefono: '+50312345681', estado: 'activo', fecha_inscripcion: '2025-05-01' },
  { id: 'c5', nombre: 'Jorge', apellido: 'Rodríguez', email: 'jorge@demo.com', telefono: '+50312345682', estado: 'activo', fecha_inscripcion: '2025-09-05' },
  { id: 'c6', nombre: 'Laura', apellido: 'Martínez', email: 'laura@demo.com', telefono: '+50312345683', estado: 'activo', fecha_inscripcion: '2025-10-12' },
  { id: 'c7', nombre: 'Diego', apellido: 'Pérez', email: 'diego@demo.com', telefono: '+50312345684', estado: 'activo', fecha_inscripcion: '2025-08-30' },
  { id: 'c8', nombre: 'Sofía', apellido: 'Herrera', email: 'sofia@demo.com', telefono: '+50312345685', estado: 'activo', fecha_inscripcion: '2025-11-15' },
  { id: 'c9', nombre: 'Marco', apellido: 'Vega', email: 'marco@demo.com', telefono: '+50312345686', estado: 'inactivo', fecha_inscripcion: '2025-03-10' },
  { id: 'c10', nombre: 'Valeria', apellido: 'Castro', email: 'valeria@demo.com', telefono: '+50312345687', estado: 'inactivo', fecha_inscripcion: '2025-02-20' },
]

export const demoPromotions = []

// Demo payments - pagos distribuidos a lo largo del año
export const demoPayments = (() => {
  const payments = []
  let id = 1

  // Enero - Mayo: pagos regulares
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']
  months.forEach((month) => {
    const [year, mon] = month.split('-').map(Number)
    const daysInMonth = new Date(year, mon, 0).getDate()

    // 4-5 pagos por mes (diferentes clientes, diferentes días)
    for (let i = 1; i <= 5; i++) {
      const day = Math.min(i * 5, daysInMonth)
      const dateStr = `${month}-${String(day).padStart(2, '0')}`
      const clientId = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'][i % 8]
      const tipo = i === 1 ? 'inscripcion' : 'mensual'
      const monto = tipo === 'inscripcion' ? 50 : 25

      payments.push({
        id: `p${id++}`,
        client_id: clientId,
        tipo,
        monto,
        fecha_pago: dateStr,
        mes_correspondiente: month,
      })
    }
  })

  // Marzo actual: pagos adicionales para demostrar gráfica diaria/semanal
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthStr = format(today, 'yyyy-MM')

  // Hoy (26 Mar): 2 pagos en diferentes horas
  payments.push(
    { id: `p${id++}`, client_id: 'c1', tipo: 'mensual', monto: 25, fecha_pago: todayStr, mes_correspondiente: monthStr },
    { id: `p${id++}`, client_id: 'c2', tipo: 'mensual', monto: 25, fecha_pago: todayStr, mes_correspondiente: monthStr }
  )

  // Últimos 7 días
  for (let i = 1; i < 7; i++) {
    const d = subDays(today, i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const monthKey = format(d, 'yyyy-MM')
    payments.push({
      id: `p${id++}`,
      client_id: ['c3', 'c4', 'c5', 'c6'][i % 4],
      tipo: 'mensual',
      monto: 25,
      fecha_pago: dateStr,
      mes_correspondiente: monthKey,
    })
  }

  return payments
})()

// Demo memberships - activas para clientes activos
export const demoMemberships = [
  { id: 'm1', client_id: 'c1', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-03-01', fecha_vencimiento: '2026-04-01' },
  { id: 'm2', client_id: 'c2', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-03-02', fecha_vencimiento: '2026-04-02' },
  { id: 'm3', client_id: 'c3', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-02-15', fecha_vencimiento: '2026-03-15' },
  { id: 'm4', client_id: 'c4', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-03-05', fecha_vencimiento: '2026-04-05' },
  { id: 'm5', client_id: 'c5', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-03-10', fecha_vencimiento: '2026-04-10' },
  { id: 'm6', client_id: 'c6', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-03-12', fecha_vencimiento: '2026-04-12' },
  { id: 'm7', client_id: 'c7', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-02-20', fecha_vencimiento: '2026-03-20' },
  { id: 'm8', client_id: 'c8', tipo: 'mensual', estado: 'activa', fecha_inicio: '2026-03-15', fecha_vencimiento: '2026-04-15' },
]

// Demo attendance - 30 días de historial realista
export const demoAttendance = (() => {
  const records = []
  const hours = ['06:15', '06:45', '07:00', '07:30', '08:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:45']
  const clientIds = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']

  // Generar 30 días hacia atrás
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Menos asistencias en fin de semana
    const clientCount = isWeekend ? 3 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 3)
    const selectedClients = [...clientIds].sort(() => Math.random() - 0.5).slice(0, clientCount)

    selectedClients.forEach((clientId, idx) => {
      const hora = hours[Math.floor(Math.random() * hours.length)]
      const [h, m] = hora.split(':').map(Number)

      // Calcular hora de salida (1-2 horas después)
      const salida = Math.floor(Math.random() * 60) + 60 // 60-120 minutos
      const exitH = Math.floor((h * 60 + m + salida) / 60) % 24
      const exitM = (m + salida) % 60
      const horaSalida = `${String(exitH).padStart(2, '0')}:${String(exitM).padStart(2, '0')}`

      records.push({
        id: `att_${dateStr}_${clientId}_${idx}`,
        client_id: clientId,
        fecha: dateStr,
        hora,
        hora_salida: horaSalida,
        created_at: new Date(date).toISOString(),
        clients: demoClients.find(c => c.id === clientId),
      })
    })
  }

  // Pedro: sin asistencia hace 9 días (debería tener warning en alertas)
  // María: sin asistencia hace 17 días (debería tener danger en alertas)
  return records.filter(r => {
    const daysAgo = Math.floor((today - new Date(r.fecha)) / (1000 * 60 * 60 * 24))
    if (r.client_id === 'c3' && daysAgo >= 9) return false // Pedro: últimas 9 días sin ir
    if (r.client_id === 'c4' && daysAgo >= 17) return false // María: últimas 17 días sin ir
    return true
  })
})()

// Helper function to get demo data
export function getDemoData(table) {
  const tables = {
    clients: demoClients,
    payments: demoPayments,
    promotions: demoPromotions,
    memberships: demoMemberships,
  }
  return tables[table] || []
}

// Helper for metrics calculation
export function calculateDemoMetrics() {
  const activeClients = demoClients.filter((c) => c.estado === 'activo').length

  const thisMonth = format(today, 'yyyy-MM')
  const thisMonthPayments = demoPayments.filter((p) => p.mes_correspondiente === thisMonth)
  const income = thisMonthPayments.reduce((sum, p) => sum + Number(p.monto), 0)

  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
  const expiringSoon = demoMemberships.filter((m) => {
    const expireDate = new Date(m.fecha_vencimiento)
    return m.estado === 'activa' && expireDate <= sevenDaysLater && expireDate >= today
  }).length

  return {
    activos: activeClients,
    ingresos: income,
    pendientes: expiringSoon,
    porVencer: expiringSoon,
  }
}

// Monthly income for chart
export function calculateDemoChartData() {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today)
    d.setMonth(d.getMonth() - (5 - i))
    return {
      month: format(d, 'MMM').toUpperCase(),
      monthKey: format(d, 'yyyy-MM'),
    }
  })

  return months.map((m) => {
    const monthPayments = demoPayments.filter((p) => p.mes_correspondiente === m.monthKey)
    const ingresos = monthPayments.reduce((sum, p) => sum + Number(p.monto), 0)
    return { mes: m.month, ingresos }
  })
}

// Calculate membership status
export function getMembershipStatus(clientId) {
  const membership = demoMemberships.find((m) => m.client_id === clientId && m.estado === 'activa')
  if (!membership) return { status: 'sin-membresía', label: 'Sin membresía', color: 'bg-gray-500/10 text-gray-400' }

  const vencDate = new Date(membership.fecha_vencimiento)
  const daysUntilExpiry = Math.floor((vencDate - today) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return { status: 'vencida', label: 'VENCE HOY', color: 'bg-red-500/10 text-red-400' }
  }
  if (daysUntilExpiry === 0) {
    return { status: 'vence-hoy', label: 'VENCE HOY', color: 'bg-red-500/10 text-red-400' }
  }
  if (daysUntilExpiry <= 7) {
    return { status: 'pronto-vence', label: `VENCE EN ${daysUntilExpiry}D`, color: 'bg-yellow-500/10 text-yellow-400' }
  }
  return { status: 'al-dia', label: 'Al día', color: 'bg-green-500/10 text-green-400' }
}

// Get unpaid members (should have paid but haven't)
export function getUnpaidMembers() {
  const thisMonth = format(today, 'yyyy-MM')
  return demoClients.filter((client) => {
    const membership = demoMemberships.find((m) => m.client_id === client.id && m.estado === 'activa')
    if (!membership || membership.tipo !== 'mensual') return false

    // Check if they paid this month
    const paidThisMonth = demoPayments.some(
      (p) => p.client_id === client.id && p.tipo === 'mensual' && p.mes_correspondiente === thisMonth
    )
    return !paidThisMonth && client.estado === 'activo'
  })
}


// Get attendance for today
export function getDemoAttendanceToday() {
  const todayStr = format(today, 'yyyy-MM-dd')
  return demoAttendance.filter((a) => a.fecha === todayStr).sort((a, b) => b.hora.localeCompare(a.hora))
}

// Get attendance for a specific client
export function getDemoAttendanceForClient(clientId) {
  return demoAttendance.filter((a) => a.client_id === clientId).sort((a, b) => {
    if (a.fecha !== b.fecha) return new Date(b.fecha) - new Date(a.fecha)
    return b.hora.localeCompare(a.hora)
  })
}

// Add attendance record (for marking entrada)
export function addDemoAttendance(clientId) {
  const client = demoClients.find((c) => c.id === clientId)
  if (!client) return null

  const now = new Date()
  const fecha = format(now, 'yyyy-MM-dd')
  const hora = format(now, 'HH:mm')

  const newRecord = {
    id: 'att_' + Date.now(),
    client_id: clientId,
    fecha,
    hora,
    hora_salida: null,
    created_at: now.toISOString(),
    clients: { nombre: client.nombre, apellido: client.apellido },
  }

  demoAttendance.unshift(newRecord)
  return newRecord
}

// Add exit time (for marking salida)
export function addDemoExit(attendanceId, horaStr) {
  const record = demoAttendance.find(a => a.id === attendanceId)
  if (record) {
    record.hora_salida = horaStr
  }
  return record
}

// Get attendance for a date range
export function getDemoAttendanceRange(startDate, endDate) {
  const start = format(new Date(startDate), 'yyyy-MM-dd')
  const end = format(new Date(endDate), 'yyyy-MM-dd')
  return demoAttendance.filter(a => a.fecha >= start && a.fecha <= end)
}

// Get attendance grouped by day for a month
export function getDemoAttendanceByDay(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const byDay = {}
  demoAttendance.forEach(a => {
    if (a.fecha.startsWith(monthStr)) {
      if (!byDay[a.fecha]) byDay[a.fecha] = []
      byDay[a.fecha].push(a)
    }
  })
  return byDay
}

// Get attendance by hour for a specific day (for hourly chart)
export function getDemoAttendanceByHour(dateStr) {
  const hours = {}
  demoAttendance
    .filter(a => a.fecha === dateStr)
    .forEach(a => {
      const hour = a.hora.split(':')[0]
      hours[hour] = (hours[hour] || 0) + 1
    })
  // Return sorted by hour
  return Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0')
    return { hora: `${h}:00`, count: hours[h] || 0 }
  })
}

// Get inactive clients (no attendance in last N days)
export function getDemoInactiveClients(days) {
  const warning = [] // 7-14 days
  const danger = [] // 15+ days

  demoClients.filter(c => c.estado === 'activo').forEach(client => {
    const lastAttendance = demoAttendance
      .filter(a => a.client_id === client.id)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0]

    if (!lastAttendance) {
      // Never attended
      danger.push({ ...client, daysSince: 999 })
    } else {
      const daysSince = Math.floor((today - new Date(lastAttendance.fecha)) / (1000 * 60 * 60 * 24))
      if (daysSince >= 15) {
        danger.push({ ...client, daysSince })
      } else if (daysSince >= 7) {
        warning.push({ ...client, daysSince })
      }
    }
  })

  return { warning, danger }
}

// Daily attendance trend for last N days
export function getDemoAttendanceDailyTrend(days) {
  const trend = []
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayLabel = format(date, 'EEE d')
    const count = demoAttendance.filter(a => a.fecha === dateStr).length
    trend.push({ dia: dayLabel, count })
  }
  return trend
}

// Week comparison: current week vs previous week
export function getDemoWeekComparison() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom']
  const comparison = []

  for (let i = 0; i < 7; i++) {
    // Current week
    const currentDate = subDays(today, (today.getDay() - 1 - i + 7) % 7)
    const currentStr = format(currentDate, 'yyyy-MM-dd')
    const currentCount = demoAttendance.filter(a => a.fecha === currentStr).length

    // Previous week
    const prevDate = subDays(currentDate, 7)
    const prevStr = format(prevDate, 'yyyy-MM-dd')
    const prevCount = demoAttendance.filter(a => a.fecha === prevStr).length

    comparison.push({ dia: days[i], actual: currentCount, anterior: prevCount })
  }

  return comparison
}

// Peak hour for entire month
export function getDemoHourlyTrendMonth() {
  const hours = {}
  const thisMonth = format(today, 'yyyy-MM')
  demoAttendance
    .filter(a => a.fecha.startsWith(thisMonth))
    .forEach(a => {
      const hour = a.hora.split(':')[0]
      hours[hour] = (hours[hour] || 0) + 1
    })

  return Array.from({ length: 24 }, (_, i) => {
    const h = String(i).padStart(2, '0')
    return { hora: `${h}:00`, count: Math.round((hours[h] || 0) / new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()) } // average per day
  }).filter(h => h.count > 0)
}

// Calculate smart Y-axis scale based on data
export function calculateSmartYScale(maxValue) {
  if (maxValue === 0) return { min: 0, max: 100, step: 10 }

  const max = maxValue * 1.2 // Add 20% margin

  if (max < 100) {
    return { min: 0, max: Math.ceil(max / 10) * 10, step: 10 }
  } else if (max < 500) {
    return { min: 0, max: Math.ceil(max / 50) * 50, step: 50 }
  } else if (max < 1000) {
    return { min: 0, max: Math.ceil(max / 100) * 100, step: 100 }
  } else if (max < 5000) {
    return { min: 0, max: Math.ceil(max / 500) * 500, step: 500 }
  } else {
    return { min: 0, max: Math.ceil(max / 1000) * 1000, step: 1000 }
  }
}
