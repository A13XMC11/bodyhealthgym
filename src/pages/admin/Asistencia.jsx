import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  LogIn,
  LogOut,
  Calendar,
  Users,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  MessageCircle,
  Settings,
  BarChart2,
  Search,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const today = new Date()

export default function Asistencia() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [todayLog, setTodayLog] = useState([])
  const [monthAttendance, setMonthAttendance] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedDayClients, setSelectedDayClients] = useState([])
  const [filterClient, setFilterClient] = useState('')
  const [capacity, setCapacity] = useState(50)
  const [editingCapacity, setEditingCapacity] = useState(false)
  const [capacityInput, setCapacityInput] = useState('50')
  const [dailyTrend, setDailyTrend] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [inactiveClients, setInactiveClients] = useState({ warning: [], danger: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(null)
  const [time, setTime] = useState(new Date())

  // Timer para actualizar tiempo en tiempo real y detectar cambio de día
  useEffect(() => {
    let lastDate = format(new Date(), 'yyyy-MM-dd')
    const interval = setInterval(() => {
      const now = new Date()
      setTime(now)
      // Si cambió el día, recargar datos para reset automático
      const currentDate = format(now, 'yyyy-MM-dd')
      if (currentDate !== lastDate) {
        lastDate = currentDate
        fetchAllData()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    fetchAllData()
  }, [user])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [clientsRes, attendanceRes] = await Promise.all([
          supabase.from('clients').select('id, nombre, apellido, estado').eq('estado', 'activo'),
          supabase
            .from('attendance')
            .select('*, clients(nombre, apellido)')
            .eq('fecha', format(today, 'yyyy-MM-dd'))
            .order('hora', { ascending: false }),
        ])

        const activeClients = clientsRes.data || []
        setClients(activeClients)
        setTodayLog(attendanceRes.data || [])

        // Historial del mes
        const monthStart = startOfMonth(today).toISOString()
        const monthEnd = endOfMonth(today).toISOString()
        const { data: monthData } = await supabase
          .from('attendance')
          .select('*, clients(nombre, apellido)')
          .gte('fecha', monthStart)
          .lte('fecha', monthEnd)

        const grouped = {}
        ;(monthData || []).forEach((record) => {
          if (!grouped[record.fecha]) grouped[record.fecha] = []
          grouped[record.fecha].push(record)
        })
        setMonthAttendance(grouped)

        recalculateMetrics(activeClients, attendanceRes.data || [])
    } catch (err) {
      toast.error('Error al cargar datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const recalculateMetrics = (activeClients, todayData) => {
    // Tendencia del mes actual (día 1 hasta hoy)
    const trend = calculateCurrentMonthTrend()
    setDailyTrend(trend)

    // Datos por hora del día de hoy
    const hourly = calculateHourlyData()
    setHourlyData(hourly)

    // Clientes inactivos
    const inactive = calculateInactiveClients()
    setInactiveClients(inactive)
  }

  const calculateCurrentMonthTrend = () => {
    // Tendencia del mes actual para modo producción (Supabase)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const dayOfMonth = now.getDate()
    const trend = []

    for (let d = 1; d <= dayOfMonth; d++) {
      const date = new Date(year, month, d)
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayLabel = format(date, 'd MMM')
      const count = (monthAttendance[dateStr] || []).length
      trend.push({ dia: dayLabel, count })
    }
    return trend
  }

  const calculateHourlyData = () => {
    const hours = {}
    todayLog.forEach((a) => {
      const hour = a.hora.split(':')[0]
      hours[hour] = (hours[hour] || 0) + 1
    })
    return Array.from({ length: 24 }, (_, i) => {
      const h = String(i).padStart(2, '0')
      return { hora: `${h}:00`, count: hours[h] || 0 }
    })
  }

  const calculateInactiveClients = () => {
    const warning = []
    const danger = []

    clients.forEach((client) => {
      const lastAttendance = Object.keys(monthAttendance)
        .reverse()
        .find((dateKey) => monthAttendance[dateKey].some((a) => a.client_id === client.id))

      if (!lastAttendance) {
        danger.push({ ...client, daysSince: 999 })
      } else {
        const daysSince = Math.floor((today - new Date(lastAttendance)) / (1000 * 60 * 60 * 24))
        if (daysSince >= 15) {
          danger.push({ ...client, daysSince })
        } else if (daysSince >= 7) {
          warning.push({ ...client, daysSince })
        }
      }
    })

    return { warning, danger }
  }

  const marcarEntrada = async (client) => {
    setMarking(client.id)
    try {
      const now = new Date()
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          client_id: client.id,
          fecha: format(now, 'yyyy-MM-dd'),
          hora: format(now, 'HH:mm'),
        })
        .select('*, clients(nombre, apellido)')
        .single()

      if (error) throw error

      setTodayLog((prev) => [data, ...prev])
      recalculateMetrics(clients, [data, ...todayLog])
      toast.success(`✓ ${client.nombre} registrado - Entrada`)
    } catch (err) {
      toast.error('Error al marcar entrada')
      console.error(err)
    } finally {
      setMarking(null)
    }
  }

  const marcarSalida = async (attendanceId, client) => {
    setMarking(attendanceId)
    try {
      const horaActual = format(time, 'HH:mm')

      const { error } = await supabase
        .from('attendance')
        .update({ hora_salida: horaActual })
        .eq('id', attendanceId)

      if (error) throw error

      setTodayLog((prev) => prev.map((r) => (r.id === attendanceId ? { ...r, hora_salida: horaActual } : r)))
      recalculateMetrics(clients, todayLog)
      toast.success(`✓ ${client.nombre} registrado - Salida`)
    } catch (err) {
      toast.error('Error al marcar salida')
      console.error(err)
    } finally {
      setMarking(null)
    }
  }

  const calcDuration = (horaEntrada, horaSalida) => {
    if (!horaSalida) return null
    const [eh, em] = horaEntrada.split(':').map(Number)
    const [sh, sm] = horaSalida.split(':').map(Number)
    const mins = sh * 60 + sm - (eh * 60 + em)
    if (mins < 0) return null
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
  }

  const calcCurrentDuration = (horaEntrada) => {
    const now = time
    const [eh, em] = horaEntrada.split(':').map(Number)
    const [ch, cm] = [now.getHours(), now.getMinutes()]
    const mins = ch * 60 + cm - (eh * 60 + em)
    if (mins < 0) return null
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
  }

  const buildCalendar = () => {
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const weeks = []
    let week = Array(7).fill(null)
    const startDay = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1

    days.forEach((day, index) => {
      const weekIndex = Math.floor((index + startDay) / 7)
      const dayIndex = (index + startDay) % 7
      if (!weeks[weekIndex]) weeks[weekIndex] = Array(7).fill(null)
      weeks[weekIndex][dayIndex] = day
    })

    return weeks
  }

  const sendWhatsApp = (phone, message) => {
    if (!phone) return
    const clean = phone.replace(/[\s+\-()]/g, '')
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const getAttendanceForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return monthAttendance[dateStr] || []
  }

  const currentCapacity = todayLog.length
  const capacityPercent = capacity > 0 ? Math.round((currentCapacity / capacity) * 100) : 0
  const capacityColor =
    capacityPercent >= 80 ? 'bg-red-500/30 border-red-500/50' : capacityPercent >= 60 ? 'bg-yellow-500/30 border-yellow-500/50' : 'bg-green-500/30 border-green-500/50'
  const capacityBarColor =
    capacityPercent >= 80 ? 'bg-red-500' : capacityPercent >= 60 ? 'bg-yellow-500' : 'bg-green-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const filteredClients = clients.filter((c) => c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || c.apellido.toLowerCase().includes(searchQuery.toLowerCase()))
  const alreadyMarked = new Set(todayLog.map((a) => a.client_id))

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white">Asistencia</h2>
        <p className="text-gym-gray text-xs sm:text-sm mt-1">Panel de control avanzado de asistencia</p>
      </div>

      {/* SECCIÓN 1: REGISTRO ENTRADA/SALIDA */}
      <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <h3 className="text-white font-bold text-base sm:text-lg">📱 Registro de Entradas/Salidas</h3>
            <p className="text-gym-gray text-xs mt-0.5 capitalize">
              {format(today, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          <div className="text-xs sm:text-sm text-gym-gray font-mono bg-gym-black rounded px-3 py-2 w-fit">{format(time, 'HH:mm:ss')}</div>
        </div>

        <div className="mb-3 sm:mb-4 relative">
          <Search className="absolute left-3 top-2.5 sm:top-3 w-4 h-4 text-gym-gray flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-gym-black border border-white/10 rounded-lg text-white text-sm placeholder-gym-gray focus:outline-none focus:border-gym-red"
          />
        </div>

        {filteredClients.length === 0 ? (
          <p className="text-gym-gray text-center py-6 sm:py-8 text-sm">No hay clientes activos</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 max-h-[600px] overflow-y-auto">
            {filteredClients.map((client) => {
              const entry = todayLog.find((a) => a.client_id === client.id)
              const isMarked = alreadyMarked.has(client.id)
              const currentDuration = entry && !entry.hora_salida ? calcCurrentDuration(entry.hora) : null
              const totalDuration = entry && entry.hora_salida ? calcDuration(entry.hora, entry.hora_salida) : null

              return (
                <div key={client.id} className="bg-gym-black border border-white/10 rounded-xl p-4">
                  <div className="mb-3">
                    <div className="text-white font-semibold text-sm">
                      {client.nombre} {client.apellido}
                    </div>
                  </div>

                  {!isMarked ? (
                    <button
                      onClick={() => marcarEntrada(client)}
                      disabled={marking === client.id}
                      className="w-full px-3 py-2 bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {marking === client.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
                      Entrada
                    </button>
                  ) : (
                    <>
                      <div className="mb-3 space-y-1">
                        <div className="text-xs text-gym-gray">
                          Entrada: <span className="text-gym-red font-semibold">{entry.hora}</span>
                        </div>
                        {currentDuration && (
                          <div className="text-xs text-gym-gray">
                            Permanencia: <span className="text-blue-400 font-semibold">{currentDuration}</span>
                          </div>
                        )}
                        {totalDuration && (
                          <div className="text-xs text-gym-gray">
                            Total: <span className="text-blue-400 font-semibold">{totalDuration}</span>
                          </div>
                        )}
                        {entry.hora_salida && (
                          <div className="text-xs text-gym-gray">
                            Salida: <span className="text-green-400 font-semibold">{entry.hora_salida}</span>
                          </div>
                        )}
                      </div>

                      {!entry.hora_salida && (
                        <button
                          onClick={() => marcarSalida(entry.id, client)}
                          disabled={marking === entry.id}
                          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {marking === entry.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogOut className="w-4 h-4" />}
                          Salida
                        </button>
                      )}

                      {entry.hora_salida && (
                        <div className="w-full px-3 py-2 bg-green-500/20 text-green-400 font-bold text-sm rounded-lg text-center">
                          ✓ Completado
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: CALENDARIO MENSUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-3 sm:p-6">
          <h3 className="text-white font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gym-red flex-shrink-0" />
            <span>Historial —</span>
            <span className="text-gym-red capitalize">
              {format(today, 'MMM yyyy', { locale: es })}
            </span>
          </h3>

          <div className="mb-3 sm:mb-4">
            <label className="text-gym-gray text-xs font-semibold uppercase tracking-wider mb-2 block">Filtrar por cliente</label>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gym-black border border-white/10 rounded-lg text-white focus:outline-none focus:border-gym-red"
            >
              <option value="">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {/* Encabezado: días de la semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => (
                <div key={day} className="text-center text-gym-gray text-xs font-semibold py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendario */}
            {buildCalendar().map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-2">
                {week.map((day, dayIdx) => {
                  if (!day) {
                    return <div key={`empty-${dayIdx}`} className="aspect-square" />
                  }

                  const dayStr = format(day, 'yyyy-MM-dd')
                  const dayAttendance = monthAttendance[dayStr] || []
                  let filtered = dayAttendance

                  if (filterClient) {
                    filtered = dayAttendance.filter((a) => a.client_id === filterClient)
                  }

                  const isSelected = selectedDay === dayStr
                  const count = filtered.length

                  return (
                    <button
                      key={dayStr}
                      onClick={() => {
                        setSelectedDay(isSelected ? null : dayStr)
                        setSelectedDayClients(isSelected ? [] : filtered)
                      }}
                      className={`aspect-square rounded-lg border text-center flex flex-col items-center justify-center text-sm font-semibold transition-colors ${
                        isSelected
                          ? 'bg-gym-red border-gym-red text-white'
                          : count > 0
                          ? 'bg-gym-black border-white/20 text-white hover:border-gym-red'
                          : 'bg-gym-black border-white/5 text-gym-gray opacity-50'
                      }`}
                    >
                      <div>{format(day, 'd')}</div>
                      {count > 0 && <div className="text-xs bg-gym-red px-1.5 rounded mt-0.5">{count}</div>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Panel lateral: clientes del día seleccionado */}
          {selectedDay && selectedDayClients.length > 0 && (
            <div className="mt-6 p-4 bg-gym-black border border-white/10 rounded-lg">
              <div className="text-white font-semibold text-sm mb-3">Asistencia el {format(parseISO(selectedDay), 'dd MMM yyyy', { locale: es })}</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedDayClients.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="text-white">
                      {entry.clients?.nombre || entry.nombre} {entry.clients?.apellido || entry.apellido}
                    </span>
                    <div className="text-gym-gray text-xs">
                      {entry.hora}
                      {entry.hora_salida && ` - ${entry.hora_salida}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN 3: CAPACIDAD */}
        <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl p-3 sm:p-6">
          <h3 className="text-white font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gym-red flex-shrink-0" />
            Capacidad
          </h3>

          {/* Configurar capacidad */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gym-black border border-white/10 rounded-lg">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-gym-gray text-xs font-semibold">Máximo</span>
              {!editingCapacity ? (
                <button onClick={() => setEditingCapacity(true)} className="text-gym-red hover:text-gym-red-hover text-xs sm:text-sm p-1 -m-1">
                  <Settings className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {editingCapacity ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={capacityInput}
                  onChange={(e) => setCapacityInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gym-dark border border-gym-red rounded-lg text-white focus:outline-none"
                />
                <button
                  onClick={() => {
                    setCapacity(parseInt(capacityInput) || 50)
                    setEditingCapacity(false)
                  }}
                  className="px-3 py-2 bg-gym-red text-white rounded-lg font-bold text-sm"
                >
                  Ok
                </button>
              </div>
            ) : (
              <div className="text-3xl font-black text-white">{capacity}</div>
            )}
          </div>

          {/* Barra de progreso */}
          <div className={`p-4 border rounded-lg mb-4 ${capacityColor}`}>
            <div className="text-gym-gray text-xs font-semibold mb-2">Ocupación actual</div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-black text-white">
                {currentCapacity}/{capacity}
              </div>
              <div className={`text-sm font-bold ${capacityPercent >= 80 ? 'text-red-400' : capacityPercent >= 60 ? 'text-yellow-400' : 'text-green-400'}`}>
                {capacityPercent}%
              </div>
            </div>
            <div className="w-full bg-gym-black rounded-full h-3 overflow-hidden">
              <div className={`h-full ${capacityBarColor} transition-all`} style={{ width: `${Math.min(capacityPercent, 100)}%` }} />
            </div>
          </div>

          {/* Gráfica por hora */}
          <div className="mt-4">
            <div className="text-gym-gray text-xs font-semibold mb-3">Por hora del día</div>
            {hourlyData.some((h) => h.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="hora" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="Sin datos de asistencia hoy" />
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: ALERTAS DE BAJA ASISTENCIA */}
      {(inactiveClients.warning.length > 0 || inactiveClients.danger.length > 0) && (
        <div className="space-y-4">
          <h3 className="text-white font-bold text-lg">⚠️ Alertas de Inactividad</h3>

          {inactiveClients.warning.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <h4 className="text-yellow-400 font-bold">Sin asistir hace 7-14 días</h4>
              </div>
              <div className="space-y-2">
                {inactiveClients.warning.map((client) => (
                  <div key={client.id} className="bg-gym-black rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {client.nombre} {client.apellido}
                      </div>
                      <div className="text-yellow-400 text-xs mt-0.5">Última visita: hace {client.daysSince} días</div>
                    </div>
                    <button
                      onClick={() =>
                        sendWhatsApp(
                          client.telefono,
                          `Hola ${client.nombre}, te echamos de menos en Body Health Gym. ¡Te esperamos!`
                        )
                      }
                      disabled={!client.telefono}
                      title={client.telefono ? 'Enviar WhatsApp' : 'Teléfono no configurado'}
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactiveClients.danger.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <h4 className="text-red-400 font-bold">Sin asistir hace 15+ días</h4>
              </div>
              <div className="space-y-2">
                {inactiveClients.danger.map((client) => (
                  <div key={client.id} className="bg-gym-black rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {client.nombre} {client.apellido}
                      </div>
                      <div className="text-red-400 text-xs mt-0.5">Última visita: hace {client.daysSince} días</div>
                    </div>
                    <button
                      onClick={() =>
                        sendWhatsApp(
                          client.telefono,
                          `Hola ${client.nombre}, te echamos de menos en Body Health Gym. ¡Te esperamos!`
                        )
                      }
                      disabled={!client.telefono}
                      title={client.telefono ? 'Enviar WhatsApp' : 'Teléfono no configurado'}
                      className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 5: GRÁFICAS DE TENDENCIAS */}
      <div className="space-y-6">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gym-red" />
          Gráficas de Tendencias
        </h3>

        {/* Tendencia del mes actual */}
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
          <h4 className="text-white font-bold mb-4">
            Asistencia del Mes — {format(today, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </h4>
          {dailyTrend.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(dailyTrend.length / 10) - 1)} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fff' }} formatter={(value) => [value, 'Asistencias']} />
                <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} dot={{ fill: '#dc2626', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Sin datos de asistencia este mes" />
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
