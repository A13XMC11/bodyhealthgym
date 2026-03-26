import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, FileDown, Users, TrendingUp } from 'lucide-react'
import { demoClients, demoPayments } from '../../lib/demoData'

export default function Reportes() {
  const { isDemo } = useAuth()
  const [activeTab, setActiveTab] = useState('diario')
  const [payments, setPayments] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [activeTab, isDemo])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (isDemo) {
        setClients(demoClients)
        setPayments(demoPayments)
        setLoading(false)
        return
      }

      const now = new Date()
      let start, end

      if (activeTab === 'diario') {
        start = startOfDay(now).toISOString()
        end = endOfDay(now).toISOString()
      } else if (activeTab === 'semanal') {
        start = startOfWeek(now).toISOString()
        end = endOfWeek(now).toISOString()
      } else {
        start = startOfMonth(now).toISOString()
        end = endOfMonth(now).toISOString()
      }

      const [paymentsRes, clientsRes] = await Promise.all([
        supabase.from('payments').select('*, clients(nombre, apellido)').gte('fecha_pago', start).lte('fecha_pago', end),
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
    const totalIngresos = payments.reduce((sum, p) => sum + Number(p.monto), 0)
    const nuevos = payments.filter((p) => p.tipo === 'inscripcion').length
    const renovaciones = payments.filter((p) => p.tipo === 'mensual').length

    const byTipo = [
      { tipo: 'Inscripción', cantidad: nuevos, monto: payments.filter((p) => p.tipo === 'inscripcion').reduce((s, p) => s + Number(p.monto), 0) },
      { tipo: 'Mensual', cantidad: renovaciones, monto: payments.filter((p) => p.tipo === 'mensual').reduce((s, p) => s + Number(p.monto), 0) },
    ]

    const promoMap = {}
    payments.forEach((p) => {
      if (p.promocion_id) {
        promoMap[p.promocion_id] = (promoMap[p.promocion_id] || 0) + Number(p.monto)
      }
    })
    const promos = Object.entries(promoMap).map(([promoId, monto]) => {
      const promo = payments.find((p) => p.promocion_id === promoId)
      return { nombre: promo?.promotions?.nombre || 'Promoción desconocida', monto }
    })

    // Chart data (daily breakdown for the selected period)
    const now = new Date()
    let dateRange = []
    if (activeTab === 'diario') {
      dateRange = [format(now, 'yyyy-MM-dd')]
    } else if (activeTab === 'semanal') {
      dateRange = Array.from({ length: 7 }, (_, i) => format(subDays(now, 6 - i), 'yyyy-MM-dd'))
    } else {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      dateRange = Array.from({ length: daysInMonth }, (_, i) =>
        format(new Date(now.getFullYear(), now.getMonth(), i + 1), 'yyyy-MM-dd')
      )
    }

    const chartData = dateRange.map((dateStr) => {
      const dayPayments = payments.filter((p) => p.fecha_pago === dateStr)
      const dayIncome = dayPayments.reduce((s, p) => s + Number(p.monto), 0)
      return {
        fecha: activeTab === 'diario' ? format(new Date(dateStr), 'HH:mm') : format(new Date(dateStr), 'dd MMM'),
        ingresos: dayIncome,
      }
    })

    return { totalIngresos, nuevos, renovaciones, byTipo, promos, chartData }
  }, [payments, activeTab])

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Reportes</h2>
          <p className="text-gym-gray text-sm mt-1">Análisis de ingresos e información</p>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 bg-gym-dark rounded-xl p-1 w-fit">
        {[
          ['diario', '📅 Diario'],
          ['semanal', '📊 Semanal'],
          ['mensual', '📈 Mensual'],
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === tab ? 'bg-gym-red text-white' : 'text-gym-gray hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Total Ingresos</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-black text-white">${reportData.totalIngresos.toFixed(2)}</div>
        </div>

        <div className="bg-gym-dark border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Nuevos</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{reportData.nuevos}</div>
        </div>

        <div className="bg-gym-dark border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Renovaciones</span>
            <TrendingUp className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-black text-white">{reportData.renovaciones}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
        <h3 className="text-white font-bold mb-6">Ingresos Diarios</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={reportData.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis dataKey="fecha" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fff' }}
              formatter={(value) => [`$${value}`, 'Ingresos']}
            />
            <Bar dataKey="ingresos" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By Tipo + Promos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Tipo */}
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Ingresos por Tipo</h3>
          <div className="space-y-3">
            {reportData.byTipo.map((item) => (
              <div key={item.tipo} className="bg-gym-black rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-white text-sm font-semibold">{item.tipo}</div>
                  <div className="text-gym-gray text-xs mt-0.5">{item.cantidad} registro(s)</div>
                </div>
                <div className="text-gym-red font-black text-lg">${item.monto.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Promos */}
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Promociones Utilizadas</h3>
          {reportData.promos.length === 0 ? (
            <p className="text-gym-gray text-sm text-center py-8">Sin promociones utilizadas</p>
          ) : (
            <div className="space-y-3">
              {reportData.promos.map((promo, idx) => (
                <div key={idx} className="bg-gym-black rounded-lg p-4 flex items-center justify-between">
                  <div className="text-white text-sm font-semibold">{promo.nombre}</div>
                  <div className="text-gym-red font-black text-lg">${promo.monto.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
