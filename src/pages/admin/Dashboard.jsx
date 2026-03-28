import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Users, DollarSign, AlertCircle, ClipboardList, AlertTriangle, MessageCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

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
      const now = new Date()
      const thisMonthStart = startOfMonth(now).toISOString()
      const thisMonthEnd = endOfMonth(now).toISOString()

      const [clientsRes, paymentsRes, membershipsRes, attendanceRes] = await Promise.all([
        supabase.from('clients').select('id, nombre, apellido, telefono, estado, email'),
        supabase.from('payments').select('monto, fecha_pago').gte('fecha_pago', thisMonthStart).lte('fecha_pago', thisMonthEnd),
        supabase.from('memberships').select('*, clients(id, nombre, apellido, telefono, email)').eq('estado', 'activa'),
        supabase.from('attendance').select('id').eq('fecha', format(now, 'yyyy-MM-dd')),
      ])

      const activos = (clientsRes.data || []).filter((c) => c.estado === 'activo').length
      const ingresos = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.monto), 0)

      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const membershipsData = membershipsRes.data || []
      const porVencer = membershipsData.filter((m) => {
        const venc = new Date(m.fecha_vencimiento)
        return venc <= sevenDaysLater && venc >= now
      }).length

      // Get expiring members with client info
      const expiring = membershipsData
        .filter((m) => {
          const venc = new Date(m.fecha_vencimiento)
          return venc <= sevenDaysLater && venc >= now
        })
        .map((m) => ({
          ...m.clients,
          fecha_vencimiento: m.fecha_vencimiento,
        }))

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Dashboard</h2>
        <p className="text-gym-gray text-sm mt-1">Resumen del gimnasio</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-gym-dark border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-3xl font-black text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-bold mb-6">Ingresos Últimos 6 Meses</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fff', padding: '8px 12px' }}
              labelStyle={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '4px' }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
              labelFormatter={(label) => `${label}`}
              cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }}
            />
            <Bar dataKey="ingresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alerts Section */}
      {expiringMembers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-white font-bold text-lg">⚠️ Membresías Próximas a Vencer</h3>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <h4 className="text-yellow-400 font-bold">Membresías Próximas a Vencer en 7 días</h4>
            </div>
            <div className="space-y-2">
              {expiringMembers.map((member) => {
                const daysLeft = Math.max(0, Math.floor((new Date(member.fecha_vencimiento) - new Date()) / 86400000))
                const daysText = daysLeft === 0 ? 'hoy' : `en ${daysLeft} días`
                return (
                  <div key={member.id} className="bg-gym-black rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {member.nombre} {member.apellido}
                      </div>
                      <div className="text-yellow-400 text-xs mt-0.5">{member.email}</div>
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
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
