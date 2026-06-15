import { useState } from 'react'
import { Settings, Building, Bell, Shield, Palette, Globe } from 'lucide-react'
import { useToast } from '../components/Toast'

const TABS = [
  { key: 'geral', label: 'Geral', icon: Building },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
  { key: 'seguranca', label: 'Segurança', icon: Shield },
  { key: 'aparencia', label: 'Aparência', icon: Palette },
  { key: 'integracao', label: 'Integrações', icon: Globe },
]

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('geral')
  const { addToast } = useToast()

  const handleSave = () => addToast('success', 'Configurações salvas com sucesso')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-vivas-blue" />
          Configurações do Sistema
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie as configurações da plataforma VIVAS</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-56 space-y-1 flex-shrink-0">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-vivas-blue text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 card">
          {activeTab === 'geral' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Informações da Unidade</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Unidade</label>
                  <input className="input-field" defaultValue="VIVAS Saúde - Unidade Central" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNES</label>
                  <input className="input-field" defaultValue="7891023" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input className="input-field" defaultValue="12.345.678/0001-90" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input className="input-field" defaultValue="(31) 3333-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input className="input-field" defaultValue="Av. Augusto de Lima, 1715, Barro Preto, Belo Horizonte/MG" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Funcionamento</label>
                  <input className="input-field" defaultValue="07:00 às 22:00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dias de Funcionamento</label>
                  <input className="input-field" defaultValue="Segunda a Sábado" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuso Horário</label>
                  <select className="input-field">
                    <option>America/Sao_Paulo (BRT)</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary">Salvar Alterações</button>
            </div>
          )}

          {activeTab === 'notificacoes' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Notificações</h2>
              {[
                { label: 'Novos agendamentos', desc: 'Notificar quando um agendamento é criado', checked: true },
                { label: 'Resultados de exames', desc: 'Notificar quando resultado fica disponível', checked: true },
                { label: 'Triagem urgente', desc: 'Alertar pacientes com classificação vermelha/laranja', checked: true },
                { label: 'Lembretes de consulta', desc: 'Enviar lembrete 24h antes da consulta', checked: false },
                { label: 'Relatórios semanais', desc: 'Enviar resumo semanal por email', checked: false },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-vivas-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-vivas-blue after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              ))}
              <button onClick={handleSave} className="btn-primary">Salvar Preferências</button>
            </div>
          )}

          {activeTab === 'seguranca' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Segurança</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo de expiração da sessão</label>
                  <select className="input-field !w-auto">
                    <option>1 hora</option>
                    <option>4 horas</option>
                    <option>8 horas</option>
                    <option selected>24 horas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Força mínima da senha</label>
                  <select className="input-field !w-auto">
                    <option>6+ caracteres</option>
                    <option>8+ caracteres com número</option>
                    <option>8+ caracteres com número e especial</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Autenticação em dois fatores (2FA)</p>
                    <p className="text-xs text-gray-500">Exigir 2FA para todos os profissionais de saúde</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-vivas-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-vivas-blue after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary">Salvar Configurações</button>
            </div>
          )}

          {activeTab === 'aparencia' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Aparência</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor Principal</label>
                  <div className="flex gap-3">
                    {['#0057B8', '#2563EB', '#0891B2', '#059669', '#7C3AED'].map(c => (
                      <button key={c} className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg border-2 border-vivas-blue bg-white text-sm font-medium">Claro</button>
                    <button className="px-4 py-2 rounded-lg border-2 border-gray-200 bg-gray-900 text-white text-sm font-medium">Escuro</button>
                    <button className="px-4 py-2 rounded-lg border-2 border-gray-200 bg-gray-100 text-sm font-medium">Sistema</button>
                  </div>
                </div>
              </div>
              <button onClick={handleSave} className="btn-primary">Salvar Aparência</button>
            </div>
          )}

          {activeTab === 'integracao' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Integrações</h2>
              {[
                { name: 'e-SUS PEC', desc: 'Prontuário Eletrônico do Cidadão', status: 'Conectado', color: 'text-green-600' },
                { name: 'CADSUS', desc: 'Cadastro Nacional de Usuários do SUS', status: 'Conectado', color: 'text-green-600' },
                { name: 'BPA (SIA/SUS)', desc: 'Boletim de Produção Ambulatorial', status: 'Pendente', color: 'text-amber-600' },
                { name: 'SIGTAP', desc: 'Tabela de Procedimentos do SUS', status: 'Conectado', color: 'text-green-600' },
                { name: 'WhatsApp Business', desc: 'Notificações via WhatsApp', status: 'Não configurado', color: 'text-gray-400' },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <span className={`text-sm font-medium ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
