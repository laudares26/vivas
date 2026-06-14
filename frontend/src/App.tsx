import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
      </Route>
    </Routes>
  )
}
