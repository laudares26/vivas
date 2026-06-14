import { useEffect, useState } from 'react'
import { Users, UserCog, CalendarDays, AlertTriangle, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { api, type DashboardData } from '../services/api'

const MANCHESTER_COLORS: Record<string, string> = {
  vermelho: '#DC2626', laranja: '#EA580C', amarelo: '#EAB308', verde: '#16A34A', azul: '#2563EB',
}
const MANCHESTER_LABELS: Record<string, string> = {
  vermelho: 'Emergência', laranja: 'Muito Urgente', amarelo: 'Urgente', verde: 'Pouco Urgente', azul: 'Não Urgente',
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>

  if (!data) return <div className="text-center py-12 text-gray-500">Erro ao carregar dashboard</div>

  const kpiCards = [
    { label: 'Pacientes Ativos', value: data.kpis.totalPatients, icon: Users, color: 'text-vivas-blue', bg: 'bg-vivas-blue-light' },
    { label: 'Profissionais', value: data.kpis.totalProfessionals, icon: UserCog, color: 'text-vivas-green', bg: 'bg-vivas-green-light' },
    { label: 'Consultas Hoje', value: data.kpis.appointmentsToday, icon: CalendarDays, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Fila Triagem', value: data.kpis.triageQueue, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  const specialtyData = data.specialtyStats.map(s => ({ name: s.specialty, atendimentos: parseInt(String(s.count)) }))
  const manchesterData = data.manchesterStats.map(m => ({
    name: MANCHESTER_LABELS[m.manchester_color] || m.manchester_color,
    value: parseInt(String(m.count)),
    color: MANCHESTER_COLORS[m.manchester_color] || '#999',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da unidade de saúde</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(kpi => (
          <div key={kpi.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm text-gray-500">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-vivas-blue" />
            Atendimentos por Especialidade
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={specialtyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="atendimentos" fill="#0057B8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Classificação Manchester (30 dias)
          </h3>
          {manchesterData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={manchesterData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {manchesterData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {manchesterData.map(m => (
                  <div key={m.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-gray-600">{m.name}</span>
                    <span className="font-semibold text-gray-900 ml-auto">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados de triagem</p>
          )}
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-vivas-blue" />
          Próximas Consultas
        </h3>
        {data.upcomingAppointments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nenhuma consulta agendada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Paciente</th>
                  <th className="pb-3 font-medium">Profissional</th>
                  <th className="pb-3 font-medium">Especialidade</th>
                  <th className="pb-3 font-medium">Data/Hora</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingAppointments.map(apt => (
                  <tr key={apt.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-900">{apt.patient_name}</td>
                    <td className="py-3 text-gray-600">{apt.professional_name}</td>
                    <td className="py-3"><span className="badge-sus">{apt.specialty || 'Geral'}</span></td>
                    <td className="py-3 text-gray-600">{new Date(apt.date_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="py-3">
                      <span className={`badge ${apt.status === 'confirmado' ? 'bg-green-100 text-green-700' : apt.status === 'agendado' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {apt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
