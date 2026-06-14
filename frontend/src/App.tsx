import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pacientes from './pages/Pacientes'
import Profissionais from './pages/Profissionais'
import Agendamentos from './pages/Agendamentos'
import Atendimento from './pages/Atendimento'
import Prontuario from './pages/Prontuario'
import Exames from './pages/Exames'
import Prescricoes from './pages/Prescricoes'
import Teleconsulta from './pages/Teleconsulta'
import Triagem from './pages/Triagem'
import Assistente from './pages/Assistente'
import Predicao from './pages/Predicao'
import Cupons from './pages/Cupons'
import Usuarios from './pages/Usuarios'
import Configuracoes from './pages/Configuracoes'

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-vivas-blue border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Carregando VIVAS Saúde...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/profissionais" element={<Profissionais />} />
        <Route path="/agendamentos" element={<Agendamentos />} />
        <Route path="/atendimento" element={<Atendimento />} />
        <Route path="/prontuario" element={<Prontuario />} />
        <Route path="/exames" element={<Exames />} />
        <Route path="/prescricoes" element={<Prescricoes />} />
        <Route path="/teleconsulta" element={<Teleconsulta />} />
        <Route path="/triagem" element={<Triagem />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/predicao" element={<Predicao />} />
        <Route path="/cupons" element={<Cupons />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={loading ? null : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}
