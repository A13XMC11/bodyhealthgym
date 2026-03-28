import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Search, UserCheck, UserX, X, CreditCard, ClipboardList, MessageCircle, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Country codes for phone input
const COUNTRY_CODES = [
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
]

// Phone Input Component with Country Code Selector
function PhoneInputWithCode({ field }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCode, setSelectedCode] = useState(COUNTRY_CODES[0])

  const phoneNumber = field.value ? field.value.replace(/\D/g, '').replace(selectedCode.code.replace('+', ''), '') : ''

  const handleCodeChange = (newCode) => {
    setSelectedCode(newCode)
    const numberOnly = field.value ? field.value.replace(/\D/g, '').replace(selectedCode.code.replace('+', ''), '') : ''
    field.onChange(`${newCode.code}${numberOnly}`)
    setIsOpen(false)
  }

  const handlePhoneChange = (e) => {
    const numberOnly = e.target.value.replace(/\D/g, '')
    field.onChange(`${selectedCode.code}${numberOnly}`)
  }

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gym-black border border-white/10 rounded-lg rounded-r-none px-3 py-2.5 text-white text-sm hover:border-gym-red/50 transition-colors flex-shrink-0"
      >
        <span className="text-base">{selectedCode.flag}</span>
        <span className="font-semibold">{selectedCode.code}</span>
        <ChevronDown className="w-3 h-3 text-gym-gray" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gym-dark border border-white/10 rounded-lg shadow-lg z-10 w-48">
          {COUNTRY_CODES.map((cc) => (
            <button
              key={cc.code}
              type="button"
              onClick={() => handleCodeChange(cc)}
              className="w-full text-left px-4 py-2.5 hover:bg-gym-red/20 text-white text-sm flex items-center gap-2 border-b border-white/5 last:border-b-0 transition-colors"
            >
              <span className="text-base">{cc.flag}</span>
              <span className="font-semibold">{cc.code}</span>
              <span className="text-gym-gray text-xs ml-auto">{cc.country}</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        className="flex-1 bg-gym-black border border-white/10 rounded-lg rounded-l-none px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
        placeholder="987654321"
      />
    </div>
  )
}


export default function Clientes() {
  const { user } = useAuth()
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

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      fechaInscripcion: new Date().toISOString().split('T')[0]
    }
  })

  useEffect(() => { fetchClients() }, [user])

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
      // Ensure date is properly captured; use today's date if not provided
      const fechaInscripcion = formData.fechaInscripcion && formData.fechaInscripcion.trim()
        ? formData.fechaInscripcion
        : new Date().toISOString().split('T')[0]
      const tipoPago = formData.tipoPago || 'inscripcion_mensual'

      // 1. Create client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          fecha_inscripcion: fechaInscripcion,
          estado: 'activo'
        })
        .select()
        .single()
      if (clientError) throw clientError

      // 2. Create payment(s) based on type
      const pagosACrear = []
      let montoTotal = 0
      let notasTotal = []

      if (tipoPago === 'inscripcion_mensual') {
        pagosACrear.push({ tipo: 'inscripcion', monto: 5 })
        pagosACrear.push({ tipo: 'mensual', monto: 25 })
        montoTotal = 30
        notasTotal = ['Inscripción $5', 'Primer mes $25']
      } else if (tipoPago === 'solo_mensual') {
        pagosACrear.push({ tipo: 'mensual', monto: 25 })
        montoTotal = 25
        notasTotal = ['Primer mes $25']
      } else if (tipoPago === 'solo_diario') {
        pagosACrear.push({ tipo: 'diario', monto: 3 })
        montoTotal = 3
        notasTotal = ['Pago diario $3']
      } else if (tipoPago === 'solo_inscripcion') {
        pagosACrear.push({ tipo: 'inscripcion', monto: 5 })
        montoTotal = 5
        notasTotal = ['Inscripción $5']
      }

      // Insert all payments
      if (pagosACrear.length > 0) {
        const pagosParaInsert = pagosACrear.map((pago) => ({
          client_id: client.id,
          tipo: pago.tipo,
          monto: pago.monto,
          fecha_pago: fechaInscripcion,
          mes_correspondiente: fechaInscripcion.substring(0, 7),
          notas: notasTotal.join(' + '),
        }))

        const { error: pagoError } = await supabase.from('payments').insert(pagosParaInsert)
        if (pagoError) throw pagoError
      }

      // 3. Create membership if includes 'mensual'
      if (tipoPago === 'inscripcion_mensual' || tipoPago === 'solo_mensual') {
        const vencimiento = new Date(fechaInscripcion)
        vencimiento.setMonth(vencimiento.getMonth() + 1)

        await supabase.from('memberships').insert({
          client_id: client.id,
          tipo: 'mensual',
          fecha_inicio: fechaInscripcion,
          fecha_vencimiento: vencimiento.toISOString().split('T')[0],
          estado: 'activa',
        })
      }

      const mensajeExito = montoTotal > 0
        ? `✅ Cliente registrado — $${montoTotal} cobrado`
        : '✅ Cliente registrado sin pago inicial'

      toast.success(mensajeExito)
      reset()
      setShowModal(false)
      fetchClients()
    } catch (err) {
      toast.error(err.message || 'Error al registrar cliente')
    }
    setSaving(false)
  }

  const toggleEstado = async (client) => {
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

  const getMembershipStatus = (clientId) => {
    return {
      label: 'Verificar',
      color: 'bg-gray-500/10 text-gray-400'
    }
  }

  const sendWhatsApp = (phone, message) => {
    if (!phone) {
      alert('Este cliente no tiene teléfono registrado')
      return
    }
    const clean = phone.replace(/[\s+\-()]/g, '')
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Clientes</h2>
          <p className="text-gym-gray text-xs sm:text-sm mt-1">{clients.length} registrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center sm:justify-start gap-2 bg-gym-red hover:bg-gym-red-hover text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Nuevo cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gym-gray flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gym-dark border border-white/10 rounded-lg sm:rounded-xl pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-white text-sm placeholder-gym-gray focus:outline-none focus:border-gym-red transition-colors"
        />
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="bg-gym-dark border border-white/5 rounded-lg sm:rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <div className="w-8 h-8 border-4 border-gym-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Inscripción</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Estado</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Membresía</th>
                    <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs font-semibold uppercase tracking-wider">Acciones</th>
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
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="font-semibold text-white text-xs sm:text-sm">{client.nombre} {client.apellido}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs sm:text-sm truncate">{client.email}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-gym-gray text-xs">
                        {client.fecha_inscripcion ? format(new Date(client.fecha_inscripcion), 'dd MMM yy', { locale: es }) : '—'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${client.estado === 'activo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {client.estado}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${membershipStatus.color}`}>
                          {membershipStatus.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
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
                      <td colSpan={6} className="text-center py-8 sm:py-12 text-gym-gray text-sm">No se encontraron clientes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2 p-3">
              {filtered.map((client) => {
                const membershipStatus = getMembershipStatus(client.id)
                return (
                  <div key={client.id} id={`row-${client.id}`} className={`bg-gym-black rounded-lg p-3 space-y-2 ${client.id === highlightId ? 'border-2 border-gym-red' : 'border border-white/5'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{client.nombre} {client.apellido}</div>
                        <div className="text-gym-gray text-xs mt-1 truncate">{client.email}</div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${client.estado === 'activo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {client.estado}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gym-gray">Inscripción</span>
                      <span className="text-white">{client.fecha_inscripcion ? format(new Date(client.fecha_inscripcion), 'dd MMM yy', { locale: es }) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gym-gray">Membresía</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${membershipStatus.color}`}>{membershipStatus.label}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                      <button onClick={() => verPagos(client)} className="flex-1 p-2 text-xs text-gym-gray hover:text-white hover:bg-white/5 rounded transition-colors flex items-center justify-center gap-1" title="Ver pagos">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pagos</span>
                      </button>
                      <button onClick={() => toggleEstado(client)} className="flex-1 p-2 text-xs text-gym-gray hover:text-white hover:bg-white/5 rounded transition-colors flex items-center justify-center gap-1" title="Cambiar estado">
                        {client.estado === 'activo' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{client.estado === 'activo' ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-gym-gray text-sm">No se encontraron clientes</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal: New Client */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gym-dark border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Nuevo Cliente</h3>
              <button onClick={() => { setShowModal(false); reset() }} className="text-gym-gray hover:text-white">
                <X className="w-5 h-5" />
              </button>
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
                <Controller
                  name="telefono"
                  control={control}
                  render={({ field }) => <PhoneInputWithCode field={field} />}
                />
              </div>

              {/* Payment Type Selection */}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Tipo de pago inicial</label>
                <select
                  {...register('tipoPago', { required: true })}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                >
                  <option value="inscripcion_mensual">Inscripción + Mensual ($30)</option>
                  <option value="solo_mensual">Solo Mensual ($25)</option>
                  <option value="solo_diario">Solo Diario ($3)</option>
                  <option value="solo_inscripcion">Solo Inscripción ($5)</option>
                  <option value="sin_pago">Sin pago inicial</option>
                </select>
              </div>

              {/* Registration Date */}
              <div>
                <label className="block text-gym-gray text-xs mb-1">Fecha de inscripción</label>
                <Controller
                  name="fechaInscripcion"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="date"
                      className="w-full bg-gym-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-gym-red"
                    />
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                {saving ? 'Registrando...' : 'Registrar cliente'}
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
              <div>
                <h3 className="text-white font-bold text-lg">
                  Historial — {showPagos.nombre} {showPagos.apellido}
                </h3>
                <p className="text-gym-gray text-xs mt-1">{showPagos.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    sendWhatsApp(
                      showPagos.telefono,
                      `Hola ${showPagos.nombre}, ¿cómo estás? Te escribo de Body Health Gym. 💪`
                    )
                  }
                  title={showPagos.telefono ? 'Enviar WhatsApp' : 'Sin teléfono registrado'}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    showPagos.telefono
                      ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : 'bg-gray-500/10 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button onClick={() => setShowPagos(null)} className="text-gym-gray hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
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
