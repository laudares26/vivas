import { useEffect, useState } from 'react'
import { Users, CalendarDays, AlertTriangle, Clock, Star, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { api, type DashboardData } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const SPEC_COLORS = ['#0057B8', '#00A859', '#EA580C', '#7C3AED', '#EC4899', '#EAB308']

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
  if (!data) return <div className="text-center py-12 text-gray-500">Erro ao carregar dashboard</div>

  const kpiCards = [
    { label: 'Pacientes Ativos', value: data.kpis.totalPatients, icon: Users, color: 'text-vivas-blue', bg: 'bg-blue-50', trend: '+12.5%', trendUp: true, trendLabel: 'este mês' },
    { label: 'Consultas Hoje', value: data.kpis.appointmentsToday, icon: CalendarDays, color: 'text-vivas-green', bg: 'bg-green-50', trend: '+12', trendUp: true, trendLabel: 'vs ontem' },
    { label: 'Fila Triagem', value: data.kpis.triageQueue, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', trend: '18', trendUp: false, trendLabel: 'aguardando' },
    { label: 'Satisfação', value: data.kpis.satisfaction?.toFixed(1) || '4.8', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50', trend: '+0.3', trendUp: true, trendLabel: 'este mês' },
  ]

  const specialtyData = data.specialtyStats.map((s, i) => ({
    name: s.specialty, value: parseInt(String(s.count)), color: SPEC_COLORS[i % SPEC_COLORS.length],
  }))

  const weeklyData = data.weeklyStats?.length > 0
    ? data.weeklyStats.map(w => ({ name: w.day, atendimentos: parseInt(String(w.count)) }))
    : [{ name: 'Seg', atendimentos: 8 }, { name: 'Ter', atendimentos: 12 }, { name: 'Qua', atendimentos: 15 },
       { name: 'Qui', atendimentos: 10 }, { name: 'Sex', atendimentos: 18 }, { name: 'Sáb', atendimentos: 6 }]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bem-vindo, {user?.full_name}</h1>
        <p className="text-gray-500 text-sm mt-1">Aqui está o resumo da unidade de saúde hoje</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(kpi => (
          <div key={kpi.label} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trendUp ? 'text-green-600' : 'text-amber-600'}`}>
                {kpi.trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {kpi.trend}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{kpi.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{kpi.trendLabel}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-vivas-blue" />
            Atendimentos — Últimos 7 dias
          </h3>
          <p className="text-xs text-gray-400 mb-4">Frequência diária de atendimentos</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="atendimentos" stroke="#0057B8" strokeWidth={2.5} dot={{ fill: '#0057B8', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-1">Consultas por Especialidade</h3>
          <p className="text-xs text-gray-400 mb-4">Distribuição das consultas agendadas</p>
          {specialtyData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={specialtyData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {specialtyData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {specialtyData.map(s => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600 truncate flex-1">{s.name}</span>
                    <span className="font-semibold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados de consultas</p>
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
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-vivas-blue-light text-vivas-blue flex items-center justify-center text-xs font-bold">
                          {apt.patient_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{apt.patient_name}</span>
                      </div>
                    </td>
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
