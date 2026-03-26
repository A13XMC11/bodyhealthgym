import { format, subDays, subMonths } from 'date-fns'

const today = new Date()

// Demo clients
export const demoClients = [
  {
    id: '1',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan.perez@email.com',
    telefono: '+1 555 123 4567',
    fecha_inscripcion: format(subMonths(today, 1), 'yyyy-MM-dd'),
    estado: 'activo',
    foto_url: null,
  },
  {
    id: '2',
    nombre: 'María',
    apellido: 'García',
    email: 'maria.garcia@email.com',
    telefono: '+1 555 987 6543',
    fecha_inscripcion: format(subMonths(today, 2), 'yyyy-MM-dd'),
    estado: 'activo',
    foto_url: null,
  },
  {
    id: '3',
    nombre: 'Carlos',
    apellido: 'López',
    email: 'carlos.lopez@email.com',
    telefono: '+1 555 456 7890',
    fecha_inscripcion: format(subMonths(today, 3), 'yyyy-MM-dd'),
    estado: 'inactivo',
    foto_url: null,
  },
]

// Demo promotions
export const demoPromotions = [
  {
    id: 'p1',
    nombre: '2×1 en Inscripciones',
    tipo: '2x1',
    valor: 0,
    descripcion: 'Trae un amigo y ambos pagan inscripción con descuento.',
    activa: true,
    fecha_inicio: format(subMonths(today, 1), 'yyyy-MM-dd'),
    fecha_fin: format(subMonths(today, -1), 'yyyy-MM-dd'),
    created_at: format(subMonths(today, 1), 'yyyy-MM-dd'),
  },
  {
    id: 'p2',
    nombre: '50% Descuento Primer Mes',
    tipo: 'porcentaje',
    valor: 50,
    descripcion: 'Nuevos miembros reciben 50% off en su primer mes de membresía.',
    activa: false,
    fecha_inicio: format(subMonths(today, 2), 'yyyy-MM-dd'),
    fecha_fin: format(subMonths(today, -1), 'yyyy-MM-dd'),
    created_at: format(subMonths(today, 2), 'yyyy-MM-dd'),
  },
  {
    id: 'p3',
    nombre: 'Combo: Inscripción + 3 Meses',
    tipo: 'combo',
    valor: 60,
    descripcion: 'Inscripción + 3 meses de membresía por solo $60.',
    activa: true,
    fecha_inicio: format(subMonths(today, 0.5), 'yyyy-MM-dd'),
    fecha_fin: format(subMonths(today, -2), 'yyyy-MM-dd'),
    created_at: format(subMonths(today, 0.5), 'yyyy-MM-dd'),
  },
]

// Demo payments
export const demoPayments = [
  {
    id: 'pay1',
    client_id: '1',
    tipo: 'mensual',
    monto: '25.00',
    fecha_pago: format(subDays(today, 30), 'yyyy-MM-dd'),
    mes_correspondiente: format(subMonths(today, 1), 'yyyy-MM'),
    promocion_id: null,
    notas: 'Pago recurrente mensual',
    created_at: format(subDays(today, 30), 'yyyy-MM-dd'),
    clients: demoClients[0],
    promotions: null,
  },
  {
    id: 'pay2',
    client_id: '1',
    tipo: 'inscripcion',
    monto: '30.00',
    fecha_pago: format(subMonths(today, 1), 'yyyy-MM-dd'),
    mes_correspondiente: format(subMonths(today, 1), 'yyyy-MM'),
    promocion_id: null,
    notas: 'Inscripción + primer mes ($5 + $25)',
    created_at: format(subMonths(today, 1), 'yyyy-MM-dd'),
    clients: demoClients[0],
    promotions: null,
  },
  {
    id: 'pay3',
    client_id: '2',
    tipo: 'inscripcion',
    monto: '30.00',
    fecha_pago: format(subMonths(today, 2), 'yyyy-MM-dd'),
    mes_correspondiente: format(subMonths(today, 2), 'yyyy-MM'),
    promocion_id: 'p1',
    notas: 'Inscripción + primer mes con promoción 2×1',
    created_at: format(subMonths(today, 2), 'yyyy-MM-dd'),
    clients: demoClients[1],
    promotions: demoPromotions[0],
  },
  {
    id: 'pay4',
    client_id: '2',
    tipo: 'mensual',
    monto: '25.00',
    fecha_pago: format(subMonths(today, 1), 'yyyy-MM-dd'),
    mes_correspondiente: format(subMonths(today, 1), 'yyyy-MM'),
    promocion_id: null,
    notas: 'Renovación mensual',
    created_at: format(subMonths(today, 1), 'yyyy-MM-dd'),
    clients: demoClients[1],
    promotions: null,
  },
  {
    id: 'pay5',
    client_id: '3',
    tipo: 'inscripcion',
    monto: '30.00',
    fecha_pago: format(subMonths(today, 3), 'yyyy-MM-dd'),
    mes_correspondiente: format(subMonths(today, 3), 'yyyy-MM'),
    promocion_id: null,
    notas: 'Inscripción + primer mes',
    created_at: format(subMonths(today, 3), 'yyyy-MM-dd'),
    clients: demoClients[2],
    promotions: null,
  },
  {
    id: 'pay6',
    client_id: '3',
    tipo: 'mensual',
    monto: '25.00',
    fecha_pago: format(subMonths(today, 2), 'yyyy-MM-dd'),
    mes_correspondiente: format(subMonths(today, 2), 'yyyy-MM'),
    promocion_id: null,
    notas: 'Último pago registrado',
    created_at: format(subMonths(today, 2), 'yyyy-MM-dd'),
    clients: demoClients[2],
    promotions: null,
  },
]

// Demo memberships
export const demoMemberships = [
  {
    id: 'm1',
    client_id: '1',
    tipo: 'mensual',
    fecha_inicio: format(subMonths(today, 1), 'yyyy-MM-dd'),
    fecha_vencimiento: format(subMonths(today, -1), 'yyyy-MM-dd'),
    estado: 'activa',
    created_at: format(subMonths(today, 1), 'yyyy-MM-dd'),
  },
  {
    id: 'm2',
    client_id: '2',
    tipo: 'mensual',
    fecha_inicio: format(subMonths(today, 1), 'yyyy-MM-dd'),
    fecha_vencimiento: format(subDays(today, -3), 'yyyy-MM-dd'), // Vence en 3 días
    estado: 'activa',
    created_at: format(subMonths(today, 2), 'yyyy-MM-dd'),
  },
  {
    id: 'm3',
    client_id: '3',
    tipo: 'mensual',
    fecha_inicio: format(subMonths(today, 3), 'yyyy-MM-dd'),
    fecha_vencimiento: format(subMonths(today, -2), 'yyyy-MM-dd'),
    estado: 'vencida',
    created_at: format(subMonths(today, 3), 'yyyy-MM-dd'),
  },
]

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

// Demo attendance data
const todayDate = format(today, 'yyyy-MM-dd')
const yesterday = format(subDays(today, 1), 'yyyy-MM-dd')
const twoDaysAgo = format(subDays(today, 2), 'yyyy-MM-dd')
const threeDaysAgo = format(subDays(today, 3), 'yyyy-MM-dd')
const fourDaysAgo = format(subDays(today, 4), 'yyyy-MM-dd')
const fiveDaysAgo = format(subDays(today, 5), 'yyyy-MM-dd')

export const demoAttendance = [
  // Today (2 entries)
  { id: 'att_001', client_id: '1', fecha: todayDate, hora: '07:15', created_at: `${todayDate}T07:15:00Z`, clients: { nombre: 'Juan', apellido: 'Pérez' } },
  { id: 'att_002', client_id: '2', fecha: todayDate, hora: '08:30', created_at: `${todayDate}T08:30:00Z`, clients: { nombre: 'María', apellido: 'García' } },
  // Previous days
  { id: 'att_003', client_id: '1', fecha: yesterday, hora: '07:20', created_at: `${yesterday}T07:20:00Z`, clients: { nombre: 'Juan', apellido: 'Pérez' } },
  { id: 'att_004', client_id: '3', fecha: twoDaysAgo, hora: '09:00', created_at: `${twoDaysAgo}T09:00:00Z`, clients: { nombre: 'Carlos', apellido: 'López' } },
  { id: 'att_005', client_id: '2', fecha: threeDaysAgo, hora: '08:45', created_at: `${threeDaysAgo}T08:45:00Z`, clients: { nombre: 'María', apellido: 'García' } },
  { id: 'att_006', client_id: '1', fecha: fiveDaysAgo, hora: '07:00', created_at: `${fiveDaysAgo}T07:00:00Z`, clients: { nombre: 'Juan', apellido: 'Pérez' } },
]

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
    created_at: now.toISOString(),
    clients: { nombre: client.nombre, apellido: client.apellido },
  }

  demoAttendance.unshift(newRecord)
  return newRecord
}
