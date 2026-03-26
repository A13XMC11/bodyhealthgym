import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, UserCheck, UserX, X, CreditCard, ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { demoClients, demoPayments, getMembershipStatus, getDemoAttendanceForClient } from '../../lib/demoData'

export default function Clientes() {
  const { isDemo } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPagos, setShowPagos] = useState(null)
  const [pagos, setPagos] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('pagos')
  const [highlightId, setHighlightId] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { fetchClients() }, [isDemo])

  useEffect(() => {
    const hid = searchParams.get('highlight')
    if (!hid) return
    setHighlightId(hid)
    const timer = setTimeout(() => {
      setHighlightId(null)
      searchParams.delete('highlight')
      setSearchParams(searchParams)
    }, 3000)
    return () => clearTimeout(timer)
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clients.filter((c) =>
      `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(q)
    ))
  }, [search, clients])

  const fetchClients = async () => {
    setLoading(true)
    if (isDemo) {
      setClients(demoClients)
      setFiltered(demoClients)
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('fecha_inscripcion', { ascending: false })
    if (error) toast.error('Error al cargar clientes')
    else { setClients(data || []); setFiltered(data || []) }
    setLoading(false)
  }

  const onSubmit = async (formData) => {
    setSaving(true)
    try {
      if (isDemo) {
        // Demo mode: create a temporary client for simulation
        const demoClientId = Math.random().toString(36).substr(2, 9)
        const today = new Date().toISOString().split('T')[0]
        const newClient = {
          id: demoClientId,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono || null,
          fecha_inscripcion: today,
          estado: 'activo',
          foto_url: null,
        }

        // Add to demo clients array
        demoClients.push(newClient)
        setClients([newClient, ...clients])
        setFiltered([newClient, ...filtered])

        toast.success(`✅ ${formData.nombre} registrado (Demo) — $30 cobrado automáticamente`)
        reset()
        setShowModal(false)
        return
      }

      // Real mode: Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({ ...formData, fecha_inscripcion: new Date().toISOString().split('T')[0], estado: 'activo' })
        .select()
        .single()
      if (clientError) throw clientError

      // 2. Create payment $30 (inscripcion + primer mes)
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('payments').insert({
        client_id: client.id,
        tipo: 'inscripcion',
        monto: 30,
        fecha_pago: today,
        mes_correspondiente: today.substring(0, 7),
        notas: 'Inscripción + primer mes ($5 + $25)',
      })

      // 3. Create membership
      const vencimiento = new Date()
      vencimiento.setMonth(vencimiento.getMonth() + 1)
      await supabase.from('memberships').insert({
        client_id: client.id,
        tipo: 'mensual',
        fecha_inicio: today,
        fecha_vencimiento: vencimiento.toISOString().split('T')[0],
        estado: 'activa',
      })

      toast.success('✅ Cliente registrado — $30 cobrado automáticamente')
      reset()
      setShowModal(false)
      fetchClients()
    } catch (err) {
      toast.error(err.message || 'Error al registrar cliente')
    }
    setSaving(false)
  }

  const toggleEstado = async (client) => {
    if (isDemo) {
      const nuevoEstado = client.estado === 'activo' ? 'inactivo' : 'activo'
      const updated = demoClients.map((c) =>
        c.id === client.id ? { ...c, estado: nuevoEstado } : c
      )
      setClients(updated)
      setFiltered(updated.filter((c) =>
        `${c.nombre} ${c.apellido} ${c.email}`.toLowerCase().includes(search.toLowerCase())
      ))
      toast.success(`Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`)
      return
    }
    const nuevoEstado = client.estado === 'activo' ? 'inactivo' : 'activo'
    const { error } = await supabase.from('clients').update({ estado: nuevoEstado }).eq('id', client.id)
    if (error) toast.error('Error al actualizar')
    else {
      toast.success(`Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`)
      fetchClients()
    }
  }

  const verPagos = async (client) => {
    setShowPagos(client)
    setActiveTab('pagos')
    if (isDemo) {
      const clientPagos = demoPayments.filter((p) => p.client_id === client.id)
      const clientAsistencias = getDemoAttendanceForClient(client.id)
      setPagos(clientPagos)
      setAsistencias(clientAsistencias)
      return
    }
    const [p, a] = await Promise.all([
      supabase
        .from('payments')
        .select('*, promotions(nombre)')
        .eq('client_id', client.id)
        .order('fecha_pago', { ascending: false }),
      supabase
        .from('attendance')
        .select('*')
        .eq('client_id', client.id)
        .order('fecha', { ascending: false }),
    ])
    setPagos(p.data || [])
    setAsistencias(a.data || [])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Clientes</h2>
          <p className="text-gym-gray text-sm mt-1">{clients.length} registrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gym-gray" />
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gym-dark border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gym-gray focus:outline-none focus:border-gym-red transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-gym-dark border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Inscripción</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Membresía</th>
                  <th className="text-left px-6 py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const membershipStatus = getMembershipStatus(client.id)
                  return (
                  <tr
                    key={client.id}
                    id={`row-${client.id}`}
                    className={`border-b border-white/5 hover:bg-white/2 transition-all ${
                      client.id === highlightId ? 'bg-gym-red/10 outline outline-1 outline-gym-red/50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white text-sm">{client.nombre} {client.apellido}</div>
                    </td>
                    <td className="px-6 py-4 text-gym-gray text-sm text-xs">{client.email}</td>
                    <td className="px-6 py-4 text-gym-gray text-xs">
                      {client.fecha_inscripcion ? format(new Date(client.fecha_inscripcion), 'dd MMM yy', { locale: es }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${client.estado === 'activo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {client.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${membershipStatus.color}`}>
                        {membershipStatus.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => verPagos(client)} className="p-1.5 text-gym-gray hover:text-white transition-colors" title="Ver pagos">
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleEstado(client)} className="p-1.5 text-gym-gray hover:text-white transition-colors" title="Cambiar estado">
                          {client.estado === 'activo' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gym-gray">No se encontraron clientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: New Client */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Nuevo Cliente</h3>
              <button onClick={() => { setShowModal(false); reset() }} className="text-gym-gray hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gym-red/10 border border-gym-red/20 rounded-xl p-3 mb-6 text-sm text-gym-red">
              Se cobrará automáticamente $30 (inscripción $5 + primer mes $25)
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Nombre</label>
                  <input
                    {...register('nombre', { required: true })}
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-gym-gray text-xs mb-1">Apellido</label>
                  <input
                    {...register('apellido', { required: true })}
                    className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    placeholder="Pérez"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Correo electrónico</label>
                <input
                  {...register('email', { required: true })}
                  type="email"
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                  placeholder="juan@email.com"
                />
              </div>
              <div>
                <label className="block text-gym-gray text-xs mb-1">Teléfono (opcional)</label>
                <input
                  {...register('telefono')}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                  placeholder="+1 555 123 4567"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                {saving ? 'Registrando...' : 'Registrar cliente — $30'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Payment history + Attendance */}
      {showPagos && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">
                Historial — {showPagos.nombre} {showPagos.apellido}
              </h3>
              <button onClick={() => setShowPagos(null)} className="text-gym-gray hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 mb-6 bg-gym-black rounded-xl p-1">
              {[
                ['pagos', '💳 Pagos'],
                ['asistencias', '📋 Asistencias'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                    activeTab === tab ? 'bg-gym-red text-white' : 'text-gym-gray hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Pagos Tab */}
            {activeTab === 'pagos' && (
              <>
                {pagos.length === 0 ? (
                  <p className="text-gym-gray text-center py-8">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-3">
                    {pagos.map((pago) => (
                      <div key={pago.id} className="bg-gym-black border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm font-semibold capitalize">{pago.tipo}</div>
                          <div className="text-gym-gray text-xs mt-0.5">
                            {format(new Date(pago.fecha_pago), 'dd MMM yyyy', { locale: es })}
                            {pago.promotions && <span className="ml-2 text-gym-red">· {pago.promotions.nombre}</span>}
                          </div>
                          {pago.notas && <div className="text-gym-gray text-xs mt-0.5 italic">{pago.notas}</div>}
                        </div>
                        <div className="text-gym-red font-black text-lg">${Number(pago.monto).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Asistencias Tab */}
            {activeTab === 'asistencias' && (
              <>
                {asistencias.length === 0 ? (
                  <p className="text-gym-gray text-center py-8">Sin asistencias registradas</p>
                ) : (
                  <div className="space-y-3">
                    {asistencias.map((asist) => (
                      <div key={asist.id} className="bg-gym-black border border-white/5 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm font-semibold">
                            {format(new Date(asist.fecha), 'dd MMM yyyy', { locale: es })}
                          </div>
                          <div className="text-gym-gray text-xs mt-0.5">{asist.hora}</div>
                        </div>
                        <ClipboardList className="w-4 h-4 text-gym-red" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
