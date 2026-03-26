import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import Clientes from './pages/admin/Clientes'
import Pagos from './pages/admin/Pagos'
import Promociones from './pages/admin/Promociones'
import Asistencia from './pages/admin/Asistencia'
import Reportes from './pages/admin/Reportes'
import AdminLayout from './components/admin/AdminLayout'

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #dc2626',
          },
          success: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="promociones" element={<Promociones />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="reportes" element={<Reportes />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
