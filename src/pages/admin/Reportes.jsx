import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, FileDown, Users, TrendingUp, BarChart2 } from 'lucide-react'


const today = new Date()

const calculateSmartYScale = (maxValue) => {
  if (maxValue === 0) return { min: 0, max: 100, step: 10 }

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)))
  const normalized = maxValue / magnitude

  let step = magnitude
  if (normalized <= 2) step = magnitude / 5
  else if (normalized <= 5) step = magnitude / 2

  const max = Math.ceil(maxValue / step) * step
  return { min: 0, max, step }
}

export default function Reportes() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('diario')
  const [payments, setPayments] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [paymentsRes, clientsRes] = await Promise.all([
        supabase.from('payments').select('*, clients(nombre, apellido)'),
        supabase.from('clients').select('id, nombre, apellido, estado'),
      ])

      setPayments(paymentsRes.data || [])
      setClients(clientsRes.data || [])
    } catch (err) {
      toast.error('Error al cargar reportes')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const reportData = useMemo(() => {
    // Total ingresos ANUALES (enero - diciembre del año actual)
    const yearStart = format(startOfYear(today), 'yyyy-MM-dd')
    const yearEnd = format(endOfYear(today), 'yyyy-MM-dd')
    const yearPayments = payments.filter((p) => p.fecha_pago >= yearStart && p.fecha_pago <= yearEnd)
    const totalIngresosAnual = yearPayments.reduce((sum, p) => sum + Number(p.monto), 0)

    // Filtrar pagos según el tab actual
    let filteredPayments = []
    let rangeStart, rangeEnd

    if (activeTab === 'diario') {
      rangeStart = startOfDay(today)
      rangeEnd = endOfDay(today)
    } else if (activeTab === 'semanal') {
      rangeStart = startOfWeek(today, { weekStartsOn: 1 }) // Lunes
      rangeEnd = endOfWeek(today, { weekStartsOn: 1 }) // Domingo
    } else {
      rangeStart = startOfMonth(today)
      rangeEnd = endOfMonth(today)
    }

    filteredPayments = payments.filter((p) => {
      const paymentDate = new Date(p.fecha_pago)
      return paymentDate >= rangeStart && paymentDate <= rangeEnd
    })

    const totalIngresos = filteredPayments.reduce((sum, p) => sum + Number(p.monto), 0)
    const nuevos = filteredPayments.filter((p) => p.tipo === 'inscripcion').length
    const renovaciones = filteredPayments.filter((p) => p.tipo === 'mensual').length

    const byTipo = [
      {
        tipo: 'Inscripción',
        cantidad: nuevos,
        monto: filteredPayments.filter((p) => p.tipo === 'inscripcion').reduce((s, p) => s + Number(p.monto), 0),
      },
      {
        tipo: 'Mensual',
        cantidad: renovaciones,
        monto: filteredPayments.filter((p) => p.tipo === 'mensual').reduce((s, p) => s + Number(p.monto), 0),
      },
    ]

    const promoMap = {}
    filteredPayments.forEach((p) => {
      if (p.promocion_id) {
        promoMap[p.promocion_id] = (promoMap[p.promocion_id] || 0) + Number(p.monto)
      }
    })
    const promos = Object.entries(promoMap).map(([promoId, monto]) => ({
      nombre: `Promoción ${promoId}`,
      monto,
    }))

    // Chart data dinámico según tab
    let chartData = []
    let yAxisScale = { min: 0, max: 100, step: 10 }

    if (activeTab === 'diario') {
      // Gráfica por HORAS del día
      const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
      chartData = hours.map((hour) => {
        const [hourNum] = hour.split(':').map(Number)
        const nextHourNum = (hourNum + 2) % 24

        // Pagos en esa franja horaria
        const hourPayments = filteredPayments.filter((p) => {
          const pDate = new Date(p.fecha_pago)
          const pHour = pDate.getHours()
          return pHour >= hourNum && pHour < nextHourNum
        })

        const ingresos = hourPayments.reduce((s, p) => s + Number(p.monto), 0)
        return { hora: hour, ingresos, label: hour }
      })

      const maxIncome = Math.max(...chartData.map((d) => d.ingresos), 0)
      yAxisScale = calculateSmartYScale(maxIncome)
    } else if (activeTab === 'semanal') {
      // Gráfica por DÍAS de la semana
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom']

      chartData = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(weekStart, -i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayPayments = filteredPayments.filter((p) => p.fecha_pago === dateStr)
        const ingresos = dayPayments.reduce((s, p) => s + Number(p.monto), 0)
        const dayNum = date.getDate()
        const monthStr = format(date, 'MMM', { locale: es })

        return {
          fecha: dayLabels[i],
          ingresos,
          label: `${dayLabels[i]} ${dayNum} ${monthStr}`,
        }
      })

      const maxIncome = Math.max(...chartData.map((d) => d.ingresos), 0)
      yAxisScale = calculateSmartYScale(maxIncome)
    } else {
      // Gráfica por MESES del año
      const allMonths = eachMonthOfInterval({
        start: startOfYear(today),
        end: endOfYear(today),
      })

      chartData = allMonths.map((monthDate) => {
        const monthStr = format(monthDate, 'yyyy-MM')
        const monthPayments = payments.filter((p) => p.fecha_pago.startsWith(monthStr))
        const ingresos = monthPayments.reduce((s, p) => s + Number(p.monto), 0)
        const monthLabel = format(monthDate, 'MMM', { locale: es })

        return {
          mes: monthLabel,
          ingresos,
          label: monthLabel,
          isCurrent: monthStr === format(today, 'yyyy-MM'),
        }
      })

      const maxIncome = Math.max(...chartData.map((d) => d.ingresos), 0)
      yAxisScale = calculateSmartYScale(maxIncome)
    }

    return {
      totalIngresosAnual,
      totalIngresos,
      nuevos,
      renovaciones,
      byTipo,
      promos,
      chartData,
      yAxisScale,
      rangeStart,
      rangeEnd,
    }
  }, [payments, activeTab])

  const getChartTitle = () => {
    if (activeTab === 'diario') {
      const dayName = format(today, 'EEEE', { locale: es })
      const dateStr = format(today, 'd MMM', { locale: es })
      return `Ingresos de Hoy - ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dateStr}`
    } else if (activeTab === 'semanal') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      const startStr = format(weekStart, 'd MMM', { locale: es })
      const endStr = format(weekEnd, 'd MMM', { locale: es })
      return `Ingresos Semana ${startStr} - ${endStr}`
    } else {
      const year = today.getFullYear()
      return `Ingresos Mensuales ${year}`
    }
  }

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const now = new Date()
      const title = `Reporte ${activeTab === 'diario' ? 'Diario' : activeTab === 'semanal' ? 'Semanal' : 'Mensual'} — Body Health Gym`

      // Title
      doc.setFontSize(16)
      doc.text(title, 10, 10)

      // Date
      doc.setFontSize(10)
      doc.text(`Generado: ${format(now, 'dd MMM yyyy HH:mm', { locale: es })}`, 10, 18)

      // Summary Cards
      doc.setFontSize(12)
      doc.text('Resumen', 10, 28)

      const summaryData = [
        [`Total Ingresos: $${reportData.totalIngresos.toFixed(2)}`],
        [`Nuevos Clientes: ${reportData.nuevos}`],
        [`Renovaciones: ${reportData.renovaciones}`],
      ]

      doc.setFontSize(10)
      let yPos = 35
      summaryData.forEach((row) => {
        doc.text(row[0], 10, yPos)
        yPos += 7
      })

      // By Tipo Table
      yPos += 5
      doc.setFontSize(12)
      doc.text('Ingresos por Tipo', 10, yPos)
      yPos += 7

      doc.setFontSize(9)
      const tipoTableData = reportData.byTipo.map((item) => [item.tipo, item.cantidad.toString(), `$${item.monto.toFixed(2)}`])
      doc.autoTable({
        head: [['Tipo', 'Cantidad', 'Monto']],
        body: tipoTableData,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
        bodyStyles: { textColor: [0, 0, 0] },
      })

      // Promotions Table (if any)
      if (reportData.promos.length > 0) {
        yPos = doc.lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.text('Promociones Utilizadas', 10, yPos)
        yPos += 7

        doc.setFontSize(9)
        const promoTableData = reportData.promos.map((p) => [p.nombre, `$${p.monto.toFixed(2)}`])
        doc.autoTable({
          head: [['Promoción', 'Monto']],
          body: promoTableData,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
          bodyStyles: { textColor: [0, 0, 0] },
        })
      }

      doc.save(`reporte-${activeTab}-${format(now, 'yyyy-MM-dd-HHmm')}.pdf`)
      toast.success('PDF exportado correctamente')
    } catch (err) {
      toast.error('Error al exportar PDF')
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasChartData = reportData.chartData.some((d) => d.ingresos > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Reportes</h2>
          <p className="text-gym-gray text-xs sm:text-sm mt-1">Análisis de ingresos e información</p>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
        >
          <FileDown className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Exportar PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 sm:gap-2 bg-gym-dark rounded-lg sm:rounded-xl p-1 overflow-x-auto">
        {[
          ['diario', '📅 Diario'],
          ['semanal', '📊 Semanal'],
          ['mensual', '📈 Mensual'],
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === tab ? 'bg-gym-red text-white' : 'text-gym-gray hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-2.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider line-clamp-2">Año {today.getFullYear()}</span>
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-white truncate">${reportData.totalIngresosAnual.toFixed(2)}</div>
        </div>

        <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-2.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Nuevos</span>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-white">{reportData.nuevos}</div>
        </div>

        <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-2.5 sm:p-5 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Renovaciones</span>
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0" />
          </div>
          <div className="text-xl sm:text-3xl font-black text-white">{reportData.renovaciones}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-3 sm:p-6 overflow-x-auto">
        <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-6">{getChartTitle()}</h3>

        {hasChartData ? (
          <div className="min-h-[200px] sm:min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height={typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : 300}>
              <BarChart data={reportData.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey={activeTab === 'mensual' ? 'mes' : 'hora' in reportData.chartData[0] ? 'hora' : 'fecha'}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={activeTab === 'diario' ? 0 : activeTab === 'semanal' ? 0 : 0}
                />
                <YAxis
                  domain={[reportData.yAxisScale.min, reportData.yAxisScale.max]}
                  ticks={Array.from({ length: 6 }, (_, i) => reportData.yAxisScale.min + (i * reportData.yAxisScale.step))}
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
                  labelFormatter={(label) => {
                    const dataPoint = reportData.chartData.find(
                      (d) => d[activeTab === 'mensual' ? 'mes' : 'hora' in d ? 'hora' : 'fecha'] === label
                    )
                    return dataPoint?.label || label
                  }}
                />
                <Bar dataKey="ingresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label={`Sin ingresos registrados ${activeTab === 'diario' ? 'hoy' : activeTab === 'semanal' ? 'esta semana' : 'este mes'}`} />
        )}
      </div>

      {/* By Tipo + Promos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* By Tipo */}
        <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-3 sm:p-6">
          <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Ingresos por Tipo</h3>
          <div className="space-y-2 sm:space-y-3">
            {reportData.byTipo.map((item) => (
              <div key={item.tipo} className="bg-gym-black rounded-lg p-2.5 sm:p-4 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-white text-xs sm:text-sm font-semibold truncate">{item.tipo}</div>
                  <div className="text-gym-gray text-xs mt-0.5">{item.cantidad} reg(s)</div>
                </div>
                <div className="text-gym-red font-black text-sm sm:text-lg flex-shrink-0">${item.monto.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Promos */}
        <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-3 sm:p-6">
          <h3 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Promociones Utilizadas</h3>
          {reportData.promos.length === 0 ? (
            <p className="text-gym-gray text-xs sm:text-sm text-center py-6 sm:py-8">Sin promociones utilizadas</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {reportData.promos.map((promo, idx) => (
                <div key={idx} className="bg-gym-black rounded-lg p-2.5 sm:p-4 flex items-center justify-between gap-2">
                  <div className="text-white text-xs sm:text-sm font-semibold truncate">{promo.nombre}</div>
                  <div className="text-gym-red font-black text-sm sm:text-lg flex-shrink-0">${promo.monto.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Empty state component
function EmptyChart({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gym-gray">
      <BarChart2 className="w-12 h-12 mb-2 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
