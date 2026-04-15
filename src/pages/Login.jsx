import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error('Credenciales incorrectas')
    } else {
      toast.success('¡Bienvenido!')
      navigate('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-gym-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md modal-enter">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 group mb-4">
            <img
              src="/logoBHG.png"
              alt="Body Health Gym"
              className="w-14 h-14 object-contain transition-transform duration-200 ease-out group-hover:scale-105"
            />
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              BODY HEALTH <span className="text-gym-red">GYM</span>
            </span>
          </Link>
          <p className="text-gym-gray text-sm font-medium tracking-wide">Panel de Administración</p>
        </div>

        {/* Card */}
        <div className="bg-gym-dark border border-white/5 rounded-2xl p-8 sm:p-10 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-8">Iniciar Sesión</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gym-gray mb-2.5">
                Correo electrónico
              </label>
              <input
                type="email"
                {...register('email', { required: 'El correo es requerido' })}
                className="w-full bg-gym-black border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gym-gray/70 focus:outline-none focus:border-gym-red focus:ring-1 focus:ring-gym-red/20"
                placeholder="admin@bodyhealthgym.com"
              />
              {errors.email && <p className="text-gym-red text-xs mt-2 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gym-gray mb-2.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: 'La contraseña es requerida' })}
                  className="w-full bg-gym-black border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-gym-gray/70 focus:outline-none focus:border-gym-red focus:ring-1 focus:ring-gym-red/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gym-gray hover:text-white transition-colors duration-160 w-5 h-5 flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 flex-shrink-0" /> : <Eye className="w-4 h-4 flex-shrink-0" />}
                </button>
              </div>
              {errors.password && <p className="text-gym-red text-xs mt-2 font-medium">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gym-red hover:bg-gym-red-hover disabled:opacity-50 text-white font-bold py-3 rounded-lg btn-interactive flex items-center justify-center gap-2 transition-[background-color,transform] duration-160"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Entrar al panel'}
            </button>
          </form>
        </div>

        <p className="text-center text-gym-gray text-sm mt-8">
          <Link to="/" className="text-gym-red hover:text-white transition-colors duration-160 font-medium">
            ← Volver al sitio
          </Link>
        </p>
      </div>
    </div>
  )
}
