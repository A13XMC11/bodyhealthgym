import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, FileDown, Users, TrendingUp, BarChart2, Calendar, X } from 'lucide-react'
import { fechaHoy, parseFechaLocal } from '../../lib/dates'


const today = parseFechaLocal(fechaHoy())

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
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroActivo, setFiltroActivo] = useState({ desde: '', hasta: '' })
  const [fechaError, setFechaError] = useState('')

  const todayStr = fechaHoy()

  useEffect(() => {
    fetchData(filtroActivo.desde, filtroActivo.hasta)
  }, [activeTab, filtroActivo])

  const fetchData = async (desde = '', hasta = '') => {
    setLoading(true)
    try {
      let paymentsQuery = supabase
        .from('payments')
        .select('id, client_id, tipo, monto, fecha_pago, notas, created_at, promocion_id, clients(id, nombre, apellido, email, telefono), promotions(nombre)')

      if (desde) paymentsQuery = paymentsQuery.gte('fecha_pago', desde)
      if (hasta) paymentsQuery = paymentsQuery.lte('fecha_pago', hasta)

      const [paymentsRes, clientsRes] = await Promise.all([
        paymentsQuery,
        supabase.from('clients').select('id, nombre, apellido, estado'),
      ])

      setPayments(paymentsRes.data || [])
      setClients(clientsRes.data || [])
    } catch (err) {
      toast.error('Error al cargar reportes')
      if (import.meta.env.DEV) {
        console.error(err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFiltrar = () => {
    if (fechaHasta && fechaDesde && fechaHasta < fechaDesde) {
      setFechaError('La fecha final no puede ser menor a la fecha inicial')
      return
    }
    setFechaError('')
    setFiltroActivo({ desde: fechaDesde, hasta: fechaHasta })
  }

  const handleLimpiar = () => {
    setFechaDesde('')
    setFechaHasta('')
    setFechaError('')
    setFiltroActivo({ desde: '', hasta: '' })
  }

  const hayFiltroActivo = filtroActivo.desde || filtroActivo.hasta

  const reportData = useMemo(() => {
    // Total ingresos ANUALES (enero - diciembre del año actual)
    const yearStart = format(startOfYear(today), 'yyyy-MM-dd')
    const yearEnd = format(endOfYear(today), 'yyyy-MM-dd')
    const yearPayments = payments.filter((p) => p.fecha_pago >= yearStart && p.fecha_pago <= yearEnd)
    const totalIngresosAnual = yearPayments.reduce((sum, p) => sum + Number(p.monto), 0)

    // Filtrar pagos según el tab actual — comparar strings YYYY-MM-DD directamente
    // para evitar el bug UTC donde new Date('2026-04-10') = día anterior en Ecuador
    let filteredPayments = []
    let rangeStartStr, rangeEndStr

    if (activeTab === 'diario') {
      rangeStartStr = todayStr
      rangeEndStr = todayStr
    } else if (activeTab === 'semanal') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      rangeStartStr = format(weekStart, 'yyyy-MM-dd')
      rangeEndStr = format(weekEnd, 'yyyy-MM-dd')
    } else {
      rangeStartStr = format(startOfMonth(today), 'yyyy-MM-dd')
      rangeEndStr = format(endOfMonth(today), 'yyyy-MM-dd')
    }

    filteredPayments = payments.filter(
      (p) => p.fecha_pago >= rangeStartStr && p.fecha_pago <= rangeEndStr
    )

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

    // Promociones: solo pagos que tienen promocion_id y la promoción aún existe en la tabla
    const promoMap = {}
    filteredPayments
      .filter((p) => p.promocion_id != null && p.promotions != null && p.promotions.nombre)
      .forEach((p) => {
        const key = p.promotions.nombre
        if (!promoMap[key]) promoMap[key] = { nombre: key, veces: 0, monto: 0 }
        promoMap[key].veces += 1
        promoMap[key].monto += Number(p.monto)
      })
    const promos = Object.values(promoMap)

    // Chart data dinámico según tab
    let chartData = []
    let yAxisScale = { min: 0, max: 100, step: 10 }

    if (activeTab === 'diario') {
      // Gráfica por HORAS del día usando created_at (timestamp con hora real)
      const hours = [6, 8, 10, 12, 14, 16, 18, 20, 22]
      chartData = hours.map((h) => {
        const nextH = h + 2
        const hourPayments = filteredPayments.filter((p) => {
          if (!p.created_at) return false
          // created_at viene en UTC — convertir a hora Ecuador (UTC-5)
          const utcDate = new Date(p.created_at)
          const localHour = (utcDate.getUTCHours() - 5 + 24) % 24
          return localHour >= h && localHour < nextH
        })
        const ingresos = hourPayments.reduce((s, p) => s + Number(p.monto), 0)
        const label = `${String(h).padStart(2, '0')}:00`
        return { hora: label, ingresos, label }
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
      const tabLabel = activeTab === 'diario' ? 'Diario' : activeTab === 'semanal' ? 'Semanal' : 'Mensual'
      const dateStr = `${now.getDate()} ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()]} ${now.getFullYear()}`

      const PAGE_W = 210
      const MARGIN = 14
      const COL_W = PAGE_W - MARGIN * 2
      let y = 18

      const drawLine = () => {
        doc.setDrawColor(220, 38, 38)
        doc.setLineWidth(0.4)
        doc.line(MARGIN, y, PAGE_W - MARGIN, y)
        y += 5
      }

      const row = (label, value, bold = false) => {
        doc.setFontSize(10)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(label, MARGIN, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(220, 38, 38)
        doc.text(value, PAGE_W - MARGIN, y, { align: 'right' })
        doc.setTextColor(60, 60, 60)
        y += 7
      }

      const sectionTitle = (title) => {
        y += 3
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 30, 30)
        doc.text(title, MARGIN, y)
        y += 5
        drawLine()
      }

      const tableHeader = (cols, widths) => {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setFillColor(220, 38, 38)
        doc.rect(MARGIN, y - 4, COL_W, 7, 'F')
        doc.setTextColor(255, 255, 255)
        let x = MARGIN + 2
        cols.forEach((col, i) => {
          doc.text(col, x, y)
          x += widths[i]
        })
        y += 5
        doc.setTextColor(60, 60, 60)
      }

      const tableRow = (cols, widths, shade) => {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        if (shade) {
          doc.setFillColor(248, 248, 248)
          doc.rect(MARGIN, y - 4, COL_W, 7, 'F')
        }
        let x = MARGIN + 2
        cols.forEach((col, i) => {
          doc.text(String(col), x, y)
          x += widths[i]
        })
        y += 7
      }

      // ── HEADER ──────────────────────────────────────────
      doc.setFillColor(220, 38, 38)
      doc.rect(0, 0, PAGE_W, 12, 'F')
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(`Reporte Body Health Gym — ${tabLabel}`, MARGIN, 8)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generado: ${dateStr}`, PAGE_W - MARGIN, 8, { align: 'right' })

      y = 22

      // ── MÉTRICAS ─────────────────────────────────────────
      sectionTitle('Métricas del Período')
      row('Total Ingresos', `$${reportData.totalIngresos.toFixed(2)}`, true)
      row('Nuevos Clientes (inscripciones)', `${reportData.nuevos}`)
      row('Renovaciones (mensual)', `${reportData.renovaciones}`)

      // ── INGRESOS POR TIPO ────────────────────────────────
      sectionTitle('Ingresos por Tipo')
      tableHeader(['Tipo', 'Cantidad', 'Monto'], [80, 50, 52])
      reportData.byTipo.forEach((item, i) => {
        tableRow([item.tipo, item.cantidad, `$${item.monto.toFixed(2)}`], [80, 50, 52], i % 2 === 0)
      })

      // ── PROMOCIONES ──────────────────────────────────────
      sectionTitle('Promociones Utilizadas')
      if (reportData.promos.length === 0) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120, 120, 120)
        doc.text('Sin promociones utilizadas en este período', MARGIN, y)
        y += 7
      } else {
        tableHeader(['Promoción', 'Usos', 'Monto'], [100, 40, 42])
        reportData.promos.forEach((p, i) => {
          tableRow([p.nombre, p.veces, `$${p.monto.toFixed(2)}`], [100, 40, 42], i % 2 === 0)
        })
      }

      doc.save(`reporte-${activeTab}-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.pdf`)
      toast.success('PDF exportado correctamente')
    } catch (err) {
      toast.error(`Error al exportar PDF: ${err?.message || err}`)
      console.error('[PDF]', err)
    }
  }

  const hasChartData = !loading && reportData.chartData.some((d) => d.ingresos > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Reportes</h2>
          <p className="text-gym-gray text-xs sm:text-sm mt-1">Análisis de ingresos e información</p>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl btn-interactive text-sm sm:text-base"
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
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg nav-interactive whitespace-nowrap flex-shrink-0 ${
              activeTab === tab ? 'bg-gym-red text-white' : 'text-gym-gray hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div className="bg-gym-dark border border-white/5 rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 text-gym-gray text-xs font-semibold uppercase tracking-wide">
          <Calendar className="w-3.5 h-3.5" />
          Filtrar por rango de fechas
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <label className="block text-gym-gray text-xs mb-1">Fecha desde</label>
            <input
              type="date"
              value={fechaDesde}
              max={todayStr}
              onChange={(e) => { setFechaDesde(e.target.value); setFechaError('') }}
              className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gym-red [color-scheme:dark]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-gym-gray text-xs mb-1">Fecha hasta</label>
            <input
              type="date"
              value={fechaHasta}
              max={todayStr}
              onChange={(e) => { setFechaHasta(e.target.value); setFechaError('') }}
              className={`w-full bg-gym-black border rounded-lg px-3 py-2 text-white text-sm focus:outline-none [color-scheme:dark] ${fechaError ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-gym-red'}`}
            />
          </div>
          <div className="flex gap-2 sm:items-end">
            <button
              onClick={handleFiltrar}
              className="flex-1 sm:flex-none bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 py-2 rounded-lg text-sm btn-interactive"
            >
              Filtrar
            </button>
            {hayFiltroActivo && (
              <button
                onClick={handleLimpiar}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gym-gray hover:text-white font-medium px-3 py-2 rounded-lg text-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>
        {fechaError && (
          <p className="text-red-400 text-xs">{fechaError}</p>
        )}
        {hayFiltroActivo && !fechaError && (
          <p className="text-gym-gray text-xs">
            Mostrando resultados
            {filtroActivo.desde && ` desde ${format(new Date(filtroActivo.desde + 'T00:00:00'), 'd MMM yyyy', { locale: es })}`}
            {filtroActivo.hasta && ` hasta ${format(new Date(filtroActivo.hasta + 'T00:00:00'), 'd MMM yyyy', { locale: es })}`}
          </p>
        )}
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

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasChartData ? (
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
          <EmptyChart
            label={
              hayFiltroActivo && payments.length === 0
                ? 'No se encontraron registros en este rango de fechas'
                : `Sin ingresos registrados ${activeTab === 'diario' ? 'hoy' : activeTab === 'semanal' ? 'esta semana' : 'este mes'}`
            }
          />
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
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-xs sm:text-sm font-semibold truncate">{promo.nombre}</div>
                    <div className="text-gym-gray text-xs mt-0.5">{promo.veces} uso{promo.veces !== 1 ? 's' : ''}</div>
                  </div>
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
