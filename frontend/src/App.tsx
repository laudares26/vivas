import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PatientDashboard from './pages/PatientDashboard'
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
import DicomViewer from './pages/DicomViewer'
import SaudePreventiva from './pages/SaudePreventiva'
import FamilyMembers from './pages/FamilyMembers'
import EmpresaDashboard from './pages/EmpresaDashboard'
import MentalDashboard from './pages/MentalDashboard'

function PatientRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PatientDashboard />} />
      <Route path="/agendamentos" element={<Layout><Agendamentos /></Layout>} />
      <Route path="/teleconsulta" element={<Layout><Teleconsulta /></Layout>} />
      <Route path="/saude-preventiva" element={<Layout><SaudePreventiva /></Layout>} />
      <Route path="/familia" element={<Layout><FamilyMembers /></Layout>} />
      <Route path="/mental" element={<MentalDashboard />} />
      <Route path="/configuracoes" element={<Layout><Configuracoes /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RHRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<EmpresaDashboard />} />
        <Route path="/empresas" element={<EmpresaDashboard />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function ProfessionalRoutes() {
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
        <Route path="/dicom" element={<DicomViewer />} />
        <Route path="/saude-preventiva" element={<SaudePreventiva />} />
        <Route path="/familia" element={<FamilyMembers />} />
        <Route path="/empresas" element={<EmpresaDashboard />} />
        <Route path="/mental" element={<MentalDashboard />} />
      </Routes>
    </Layout>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-wine border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted text-sm">Carregando VivaS Saúde...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'paciente') {
    return <PatientRoutes />
  }

  if (user.role === 'rh') {
    return <RHRoutes />
  }

  return <ProfessionalRoutes />
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={loading ? null : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={loading ? null : user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}
