import { useEffect, useState } from 'react'
import { Search, Activity, TrendingUp, AlertTriangle, Heart, Droplets } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, type Patient, type RiskPrediction } from '../services/api'
import { useToast } from '../components/Toast'

function RiskGauge({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: typeof Heart }) {
  const pct = Math.min(100, Math.max(0, value))
  const riskLevel = pct > 70 ? 'Alto' : pct > 40 ? 'Moderado' : 'Baixo'
  const riskColor = pct > 70 ? 'text-red-600' : pct > 40 ? 'text-amber-600' : 'text-green-600'

  return (
    <div className="card text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Icon className={`w-5 h-5`} style={{ color }} />
        <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
      </div>
      <div className="relative w-32 h-32 mx-auto mb-3">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.915" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{pct.toFixed(0)}%</p>
            <p className={`text-xs font-medium ${riskColor}`}>{riskLevel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Predicao() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [predictions, setPredictions] = useState<RiskPrediction[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    api.getPatients('limit=100').then(r => setPatients(r.data)).catch(() => {})
  }, [])

  const selectPatient = async (p: Patient) => {
    setSelectedPatient(p)
    setLoading(true)
    try {
      const res = await api.getRiskPredictions(p.id)
      setPredictions(res)
    } catch { addToast('error', 'Erro ao carregar predições') }
    finally { setLoading(false) }
  }

  const latest = predictions[0]
  const evolutionData = predictions.slice().reverse().map((p, i) => ({
    name: `Avaliação ${i + 1}`,
    cardiovascular: Number(p.cardiovascular_risk),
    diabetes: Number(p.diabetes_risk),
    hipertensao: Number(p.hypertension_risk),
    renal: Number(p.renal_risk),
  }))

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Predição de Riscos</h1>
        <p className="text-gray-500 text-sm mt-1">Análise preditiva de saúde com inteligência artificial</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient selector */}
        <div className="card">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Buscar paciente..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filteredPatients.map(p => (
              <button key={p.id} onClick={() => selectPatient(p)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${selectedPatient?.id === p.id ? 'bg-vivas-blue-light text-vivas-blue' : 'hover:bg-gray-50 text-gray-700'}`}>
                <p className="font-medium">{p.full_name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Risk data */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedPatient ? (
            <div className="card text-center py-16">
              <Activity className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400">Selecione um paciente para ver a predição de riscos</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
          ) : !latest ? (
            <div className="card text-center py-16">
              <p className="text-gray-400">Nenhuma predição disponível para este paciente</p>
            </div>
          ) : (
            <>
              {/* Risk Gauges */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <RiskGauge label="Cardiovascular" value={Number(latest.cardiovascular_risk)} color="#DC2626" icon={Heart} />
                <RiskGauge label="Diabetes" value={Number(latest.diabetes_risk)} color="#EA580C" icon={Droplets} />
                <RiskGauge label="Hipertensão" value={Number(latest.hypertension_risk)} color="#EAB308" icon={Activity} />
                <RiskGauge label="Renal" value={Number(latest.renal_risk)} color="#7C3AED" icon={AlertTriangle} />
              </div>

              {/* Evolution Chart */}
              {evolutionData.length > 1 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-vivas-blue" />
                    Evolução de Riscos
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="cardiovascular" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626' }} name="Cardiovascular" />
                      <Line type="monotone" dataKey="diabetes" stroke="#EA580C" strokeWidth={2} dot={{ fill: '#EA580C' }} name="Diabetes" />
                      <Line type="monotone" dataKey="hipertensao" stroke="#EAB308" strokeWidth={2} dot={{ fill: '#EAB308' }} name="Hipertensão" />
                      <Line type="monotone" dataKey="renal" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED' }} name="Renal" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Recommendations */}
              <div className="card bg-gradient-to-r from-vivas-green-light to-green-50 border border-vivas-green/20">
                <h3 className="font-semibold text-vivas-green-dark mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recomendações Personalizadas
                </h3>
                <p className="text-sm text-gray-700">{latest.recommendations}</p>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="font-semibold text-gray-700 mb-1">Atividade Física</p>
                    <p className="text-gray-600">150 min/semana de exercício moderado</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="font-semibold text-gray-700 mb-1">Dieta</p>
                    <p className="text-gray-600">Reduzir sódio, aumentar fibras e vegetais</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <p className="font-semibold text-gray-700 mb-1">Acompanhamento</p>
                    <p className="text-gray-600">Retorno em 3 meses para reavaliação</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
