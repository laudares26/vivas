import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCog, CalendarDays, Stethoscope, FileText,
  TestTubeDiagonal, ClipboardList, Video, Brain, Bot, Activity,
  ChevronLeft, ChevronRight, Heart
} from 'lucide-react'

const clinicalLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pacientes', icon: Users, label: 'Pacientes' },
  { to: '/profissionais', icon: UserCog, label: 'Profissionais' },
  { to: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
  { to: '/atendimento', icon: Stethoscope, label: 'Atendimento' },
  { to: '/prontuario', icon: FileText, label: 'Prontuário' },
  { to: '/exames', icon: TestTubeDiagonal, label: 'Exames' },
  { to: '/prescricoes', icon: ClipboardList, label: 'Prescrições' },
  { to: '/teleconsulta', icon: Video, label: 'Teleconsulta' },
]

const aiLinks = [
  { to: '/triagem', icon: Brain, label: 'Triagem IA' },
  { to: '/assistente', icon: Bot, label: 'Assistente IA' },
  { to: '/predicao', icon: Activity, label: 'Predição Riscos' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0057B8 0%, #003D82 50%, #002D61 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-white font-bold text-lg leading-tight">VIVAS</h1>
            <p className="text-blue-200 text-[10px] leading-tight">Plataforma de Saúde</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {!collapsed && <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Área Clínica</p>}
        {clinicalLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg shadow-black/10'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium truncate">{link.label}</span>}
          </NavLink>
        ))}

        <div className={`my-3 mx-3 border-t border-white/10`} />

        {!collapsed && <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Inteligência Artificial</p>}
        {aiLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg shadow-black/10'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <link.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium truncate">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-t border-white/10 text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  )
}
