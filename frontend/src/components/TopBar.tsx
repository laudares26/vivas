import { useLocation } from 'react-router-dom'
import { Search, Bell, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const BREADCRUMBS: Record<string, string> = {
  '/': 'Dashboard', '/pacientes': 'Pacientes', '/profissionais': 'Profissionais',
  '/agendamentos': 'Agendamentos', '/atendimento': 'Atendimento Médico',
  '/prontuario': 'Prontuário Eletrônico', '/exames': 'Exames e Laudos',
  '/prescricoes': 'Receitas e Prescrições', '/teleconsulta': 'Teleconsulta',
  '/triagem': 'Triagem Inteligente', '/assistente': 'Assistente Inteligente (Apoio)',
  '/predicao': 'Suporte Preventivo', '/cupons': 'Cupons e Promoções',
  '/configuracoes': 'Configurações', '/usuarios': 'Gerenciamento de Usuários',
  '/saude-preventiva': 'Saúde Preventiva', '/dicom': 'Isis DICOM Viewer',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador', medico: 'Médico',
  psicologo: 'Psicólogo',
  paciente: 'Paciente', marketing_admin: 'Marketing',
}

interface TopBarProps {
  onMenuClick?: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const pageName = BREADCRUMBS[pathname] || 'Página'
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'US'

  return (
    <header
      className="min-h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-2 text-sm">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 md:hidden">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span className="text-gray-400 hidden sm:inline">VIVAS</span>
        <span className="text-gray-300 hidden sm:inline">›</span>
        <span className="font-medium text-gray-900 truncate">{pageName}</span>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar pacientes, médicos, exames..."
            className="pl-10 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 
                       focus:outline-none focus:ring-2 focus:ring-vivas-blue/20 focus:border-vivas-blue" />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: user?.avatar_color || '#7B1E3C' }}>
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors ml-1"
            title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
