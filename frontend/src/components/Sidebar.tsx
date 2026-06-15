import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCog, CalendarDays, Stethoscope, FileText,
  TestTubeDiagonal, ClipboardList, Video, Brain, Bot, Activity,
  ChevronLeft, ChevronRight, Heart, Tag, Settings, UsersRound, LogOut, Layers
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  to: string
  icon: typeof LayoutDashboard
  label: string
  roles?: string[]
  badge?: number
}

const clinicalLinks: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pacientes', icon: Users, label: 'Pacientes', roles: ['admin', 'medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'] },
  { to: '/profissionais', icon: UserCog, label: 'Profissionais', roles: ['admin', 'medico', 'enfermeiro'] },
  { to: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
  { to: '/atendimento', icon: Stethoscope, label: 'Atendimento Médico', roles: ['admin', 'medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'] },
  { to: '/prontuario', icon: FileText, label: 'Prontuário Eletrônico', roles: ['admin', 'medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'] },
  { to: '/exames', icon: TestTubeDiagonal, label: 'Exames e Laudos', roles: ['admin', 'medico', 'enfermeiro'] },
  { to: '/dicom', icon: Layers, label: 'Isis DICOM Viewer', roles: ['admin', 'medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'] },
  { to: '/prescricoes', icon: ClipboardList, label: 'Receitas e Prescrições', roles: ['admin', 'medico'] },
  { to: '/teleconsulta', icon: Video, label: 'Teleconsulta' },
]

const aiLinks: NavItem[] = [
  { to: '/triagem', icon: Brain, label: 'Triagem Inteligente', roles: ['admin', 'medico', 'enfermeiro'] },
  { to: '/assistente', icon: Bot, label: 'Assistente IA (Apoio)', roles: ['admin', 'medico'] },
  { to: '/predicao', icon: Activity, label: 'Suporte Preventivo', roles: ['admin', 'medico'] },
  { to: '/saude-preventiva', icon: Heart, label: 'Saúde Preventiva', roles: ['paciente'] },
]

const adminLinks: NavItem[] = [
  { to: '/cupons', icon: Tag, label: 'Cupons e Promoções', roles: ['admin', 'marketing_admin'] },
  { to: '/usuarios', icon: UsersRound, label: 'Usuários', roles: ['admin'] },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', roles: ['admin'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileHidden?: boolean
}

export default function Sidebar({ collapsed, onToggle, mobileHidden }: SidebarProps) {
  const { user, logout } = useAuth()
  const role = user?.role || 'paciente'

  const filterLinks = (links: NavItem[]) =>
    links.filter(l => !l.roles || l.roles.includes(role))

  const filteredClinical = filterLinks(clinicalLinks)
  const filteredAI = filterLinks(aiLinks)
  const filteredAdmin = filterLinks(adminLinks)

  const renderLink = (link: NavItem) => (
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
  )

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      } ${mobileHidden ? '-translate-x-full' : 'translate-x-0'}`}
      style={{
        background: 'linear-gradient(180deg, #0057B8 0%, #003D82 50%, #002D61 100%)',
      }}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
        <img src="/logo_vivas.jpg" alt="VIVAS" className={`flex-shrink-0 object-contain ${collapsed ? 'h-8 w-8' : 'h-10'}`} />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-blue-200 text-[10px] leading-tight">Saúde Inteligente</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {!collapsed && <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Principal</p>}
        {renderLink(filteredClinical[0])}

        {filteredClinical.length > 1 && (
          <>
            <div className="my-2" />
            {!collapsed && <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Clínico</p>}
            {filteredClinical.slice(1).map(renderLink)}
          </>
        )}

        {filteredAI.length > 0 && (
          <>
            <div className="my-3 mx-3 border-t border-white/10" />
            {!collapsed && <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">IA — Suporte e Apoio</p>}
            {filteredAI.map(renderLink)}
          </>
        )}

        {filteredAdmin.length > 0 && (
          <>
            <div className="my-3 mx-3 border-t border-white/10" />
            {!collapsed && <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-wider px-3 mb-2">Administrativo</p>}
            {filteredAdmin.map(renderLink)}
          </>
        )}
      </nav>

      <div className="border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-5 py-3 text-blue-200 hover:text-white hover:bg-white/10 transition-colors w-full"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
        <button
          onClick={onToggle}
          className="flex items-center justify-center h-10 border-t border-white/10 text-blue-200 hover:text-white hover:bg-white/10 transition-colors w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  )
}
