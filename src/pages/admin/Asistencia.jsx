import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { demoClients, getDemoAttendanceToday, addDemoAttendance } from '../../lib/demoData'

export default function Asistencia() {
  const { isDemo } = useAuth()
  const [clients, setClients] = useState([])
  const [todayLog, setTodayLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(null)

  useEffect(() => {
    fetchData()
  }, [isDemo])

  const fetchData = async () => {
    setLoading(true)
    if (isDemo) {
      const activeClients = demoClients.filter((c) => c.estado === 'activo')
      setClients(activeClients)
      setTodayLog(getDemoAttendanceToday())
      setLoading(false)
      return
    }

    try {
      const [clientsRes, attendanceRes] = await Promise.all([
        supabase.from('clients').select('id, nombre, apellido, estado').eq('estado', 'activo'),
        supabase
          .from('attendance')
          .select('*, clients(nombre, apellido)')
          .eq('fecha', format(new Date(), 'yyyy-MM-dd'))
          .order('hora', { ascending: false }),
      ])

      setClients(clientsRes.data || [])
      setTodayLog(attendanceRes.data || [])
    } catch (err) {
      toast.error('Error al cargar datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const marcarEntrada = async (client) => {
    setMarking(client.id)
    try {
      if (isDemo) {
        const newRecord = addDemoAttendance(client.id)
        setTodayLog((prev) => [newRecord, ...prev])
        toast.success(`✓ ${client.nombre} marcado como presente`)
        setMarking(null)
        return
      }

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
      toast.success(`✓ ${client.nombre} marcado como presente`)
    } catch (err) {
      toast.error('Error al marcar entrada')
      console.error(err)
    } finally {
      setMarking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const alreadyMarked = new Set(todayLog.map((a) => a.client_id))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Asistencia</h2>
        <p className="text-gym-gray text-sm mt-1">{todayLog.length} entradas registradas hoy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Clientes Activos</span>
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{clients.length}</div>
        </div>

        <div className="bg-gym-dark border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Presentes Hoy</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-black text-white">{todayLog.length}</div>
        </div>

        <div className="bg-gym-dark border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gym-gray text-xs font-semibold uppercase tracking-wider">Porcentaje</span>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {clients.length > 0 ? ((todayLog.length / clients.length) * 100).toFixed(0) : 0}%
          </div>
        </div>
      </div>

      {/* Grid: Clients | Today's Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Clients List */}
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">Clientes Activos</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {clients.length === 0 ? (
              <p className="text-gym-gray text-sm text-center py-8">No hay clientes activos</p>
            ) : (
              clients.map((client) => {
                const isMarked = alreadyMarked.has(client.id)
                return (
                  <div key={client.id} className="bg-gym-black rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold text-sm">
                        {client.nombre} {client.apellido}
                      </div>
                      {isMarked && <div className="text-green-400 text-xs mt-0.5">✓ Ya registrado</div>}
                    </div>
                    <button
                      onClick={() => marcarEntrada(client)}
                      disabled={marking === client.id || isMarked}
                      className="px-3 py-1.5 bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      {marking === client.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </>
                      ) : isMarked ? (
                        '✓'
                      ) : (
                        'Marcar'
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Today's Log */}
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-4">
            Entradas de Hoy{' '}
            <span className="ml-2 bg-gym-red/20 text-gym-red text-xs font-bold px-2.5 py-1 rounded-full">
              {todayLog.length}
            </span>
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {todayLog.length === 0 ? (
              <p className="text-gym-gray text-sm text-center py-8">Sin entradas registradas</p>
            ) : (
              todayLog.map((entry) => (
                <div key={entry.id} className="bg-gym-black rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold text-sm">
                      {entry.clients?.nombre || entry.nombre} {entry.clients?.apellido || entry.apellido}
                    </div>
                    <div className="text-gym-gray text-xs mt-0.5">
                      {format(new Date(entry.fecha), 'dd MMM', { locale: es })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gym-red font-bold text-sm">{entry.hora}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
