import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Users, DollarSign, AlertCircle, ClipboardList, AlertTriangle, MessageCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { fechaHoy, parseFechaLocal } from '../../lib/dates'

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState({ activos: 0, ingresos: 0, pendientes: 0, porVencer: 0 })
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [asistenciasHoy, setAsistenciasHoy] = useState(0)
  const [expiringMembers, setExpiringMembers] = useState([])

  useEffect(() => {
    fetchMetrics()
  }, [user])

  const fetchMetrics = async () => {
    try {
      const now = parseFechaLocal(fechaHoy())
      const thisMonthStart = startOfMonth(now).toISOString()
      const thisMonthEnd = endOfMonth(now).toISOString()

      const [clientsRes, paymentsRes, membershipsRes, attendanceRes] = await Promise.all([
        supabase.from('clients').select('id, nombre, apellido, telefono, estado, email'),
        supabase.from('payments').select('id, client_id, monto, fecha_pago, clients(id, nombre, apellido, email)').gte('fecha_pago', thisMonthStart).lte('fecha_pago', thisMonthEnd),
        supabase.from('memberships').select('id, client_id, fecha_vencimiento').gte('fecha_vencimiento', fechaHoy()).order('fecha_vencimiento', { ascending: true }),
        supabase.from('attendance').select('id').eq('fecha', fechaHoy()),
      ])

      const activos = (clientsRes.data || []).filter((c) => c.estado === 'activo').length
      const ingresos = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.monto), 0)

      const sevenDaysLater = parseFechaLocal(fechaHoy())
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const membershipsData = membershipsRes.data || []
      const clientsMap = new Map((clientsRes.data || []).map(c => [c.id, c]))

      const porVencer = membershipsData.filter((m) => {
        const venc = parseFechaLocal(m.fecha_vencimiento)
        return venc <= sevenDaysLater && venc >= now
      }).length

      // Get expiring members with client info
      const expiring = membershipsData
        .filter((m) => {
          const venc = parseFechaLocal(m.fecha_vencimiento)
          return venc <= sevenDaysLater && venc >= now
        })
        .map((m) => {
          const client = clientsMap.get(m.client_id)
          return {
            id: client?.id || m.client_id,
            nombre: client?.nombre || 'Desconocido',
            apellido: client?.apellido || '',
            email: client?.email || '',
            telefono: client?.telefono || '',
            fecha_vencimiento: m.fecha_vencimiento,
          }
        })

      setMetrics({ activos, ingresos, pendientes: porVencer, porVencer })
      setAsistenciasHoy((attendanceRes.data || []).length)
      setExpiringMembers(expiring)

      // Chart: last 6 months
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        return { month: format(d, 'MMM', { locale: es }), start: startOfMonth(d).toISOString(), end: endOfMonth(d).toISOString() }
      })

      const chartResults = await Promise.all(
        months.map(async (m) => {
          const { data } = await supabase.from('payments').select('monto').gte('fecha_pago', m.start).lte('fecha_pago', m.end)
          return { mes: m.month.toUpperCase(), ingresos: (data || []).reduce((s, p) => s + Number(p.monto), 0) }
        })
      )
      setChartData(chartResults)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { label: 'Clientes Activos', value: metrics.activos, icon: Users, color: 'text-blue-400' },
    { label: 'Ingresos del Mes', value: `$${metrics.ingresos.toFixed(2)}`, icon: DollarSign, color: 'text-green-400' },
    { label: 'Membresías por Vencer', value: metrics.porVencer, icon: AlertCircle, color: 'text-yellow-400' },
    { label: 'Asistencias Hoy', value: asistenciasHoy, icon: ClipboardList, color: 'text-purple-400' },
  ]

  const sendWhatsApp = (phone, message) => {
    if (!phone) return
    const clean = phone.replace(/[\s+\-()]/g, '')
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white">Dashboard</h2>
        <p className="text-gym-gray text-xs sm:text-sm mt-1">Resumen del gimnasio</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-gym-dark border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider line-clamp-2">{card.label}</span>
              <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${card.color}`} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white truncate">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gym-dark border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-6 overflow-x-auto">
        <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-6">Ingresos Últimos 6 Meses</h3>
        <div className="min-h-[200px] sm:min-h-[250px] w-full">
          <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : 250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '12px' }}
                labelStyle={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '4px' }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
                labelFormatter={(label) => `${label}`}
                cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }}
              />
              <Bar dataKey="ingresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts Section - Always visible */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-white font-bold text-base sm:text-lg">⚠️ Membresías Próximas a Vencer</h3>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
            <h4 className="text-yellow-400 font-bold text-sm sm:text-base">Próximas a Vencer (7 días)</h4>
          </div>
          {expiringMembers.length === 0 ? (
            <p className="text-gym-gray text-xs sm:text-sm text-center py-6 sm:py-8">Sin membresías próximas a vencer</p>
          ) : (
            <div className="space-y-2 sm:space-y-2">
              {expiringMembers.map((member) => {
                const daysLeft = Math.max(0, Math.floor((parseFechaLocal(member.fecha_vencimiento) - parseFechaLocal(fechaHoy())) / 86400000))
                const daysText = daysLeft === 0 ? 'hoy' : `en ${daysLeft} días`
                return (
                  <div key={member.id} className="bg-gym-black rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-semibold text-xs sm:text-sm truncate">
                        {member.nombre} {member.apellido}
                      </div>
                      <div className="text-yellow-400 text-xs mt-0.5 truncate">{member.email}</div>
                      <div className="text-gym-gray text-xs mt-1">Vence {daysText}</div>
                    </div>
                    <button
                      onClick={() =>
                        sendWhatsApp(
                          member.telefono,
                          `Hola ${member.nombre}, tu membresía de Body Health Gym vence ${daysText}. Renueva por $25. ¡Te esperamos!`
                        )
                      }
                      disabled={!member.telefono}
                      title={member.telefono ? 'Enviar WhatsApp' : 'Agrega el teléfono del cliente para enviar WhatsApp'}
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
