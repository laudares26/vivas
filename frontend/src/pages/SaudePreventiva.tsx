import { useState } from 'react'
import { Upload, FileText, Activity, Heart, Droplets, TrendingUp, AlertCircle, CheckCircle2, Clock, Bell, Send, Loader2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { api, type ExamUploadResult } from '../services/api'

interface HealthExam {
  id: number
  name: string
  date: string
  type: 'lab' | 'image'
  status: 'normal' | 'attention' | 'alert'
  aiInsight: string
}

interface HealthIndicator {
  label: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  status: 'normal' | 'attention' | 'alert'
  reference: string
}

const SAMPLE_EXAMS: HealthExam[] = [
  { id: 1, name: 'Hemograma Completo', date: '2026-05-20', type: 'lab', status: 'normal', aiInsight: 'Todos os valores dentro da faixa de referência. Manter acompanhamento anual.' },
  { id: 2, name: 'Glicemia de Jejum', date: '2026-05-20', type: 'lab', status: 'attention', aiInsight: 'Valor de 105 mg/dL indica pré-diabetes. Recomenda-se controle alimentar e exercícios regulares.' },
  { id: 3, name: 'Colesterol Total e Frações', date: '2026-04-15', type: 'lab', status: 'alert', aiInsight: 'LDL elevado (165 mg/dL). Sugestão preventiva: dieta com baixo teor de gordura saturada e atividade física 5x/semana.' },
  { id: 4, name: 'Raio-X Tórax', date: '2026-03-10', type: 'image', status: 'normal', aiInsight: 'Sem alterações significativas identificadas. Campos pulmonares limpos.' },
  { id: 5, name: 'Eletrocardiograma', date: '2026-03-10', type: 'image', status: 'normal', aiInsight: 'Ritmo sinusal normal. Frequência cardíaca de 72 bpm dentro do esperado.' },
  { id: 6, name: 'TSH e T4 Livre', date: '2026-02-28', type: 'lab', status: 'normal', aiInsight: 'Função tireoidiana normal. Próximo controle em 12 meses.' },
  { id: 7, name: 'Vitamina D', date: '2026-02-28', type: 'lab', status: 'attention', aiInsight: 'Nível de 22 ng/mL (insuficiente). Sugestão: suplementação e exposição solar moderada.' },
  { id: 8, name: 'Ultrassom Abdominal', date: '2026-01-15', type: 'image', status: 'normal', aiInsight: 'Órgãos abdominais sem alterações. Fígado, vesícula, pâncreas e rins normais.' },
]

const INDICATORS: HealthIndicator[] = [
  { label: 'Glicemia', value: 105, unit: 'mg/dL', trend: 'up', status: 'attention', reference: '70-99 mg/dL' },
  { label: 'Colesterol LDL', value: 165, unit: 'mg/dL', trend: 'up', status: 'alert', reference: '< 130 mg/dL' },
  { label: 'Pressão Arterial', value: 128, unit: 'mmHg', trend: 'stable', status: 'attention', reference: '< 120 mmHg' },
  { label: 'IMC', value: 26.5, unit: 'kg/m²', trend: 'down', status: 'attention', reference: '18.5-24.9' },
  { label: 'Hemoglobina', value: 14.2, unit: 'g/dL', trend: 'stable', status: 'normal', reference: '12-17 g/dL' },
  { label: 'Vitamina D', value: 22, unit: 'ng/mL', trend: 'up', status: 'attention', reference: '30-60 ng/mL' },
]

const GLUCOSE_HISTORY = [
  { month: 'Jan', value: 98 }, { month: 'Fev', value: 100 }, { month: 'Mar', value: 102 },
  { month: 'Abr', value: 101 }, { month: 'Mai', value: 105 }, { month: 'Jun', value: 103 },
]

const WEIGHT_HISTORY = [
  { month: 'Jan', value: 82 }, { month: 'Fev', value: 81.5 }, { month: 'Mar', value: 80.8 },
  { month: 'Abr', value: 80.2 }, { month: 'Mai', value: 79.5 }, { month: 'Jun', value: 79.1 },
]

const CHOLESTEROL_HISTORY = [
  { month: 'Jan', ldl: 170, hdl: 42 }, { month: 'Fev', ldl: 168, hdl: 43 },
  { month: 'Mar', ldl: 167, hdl: 44 }, { month: 'Abr', ldl: 166, hdl: 45 },
  { month: 'Mai', ldl: 165, hdl: 46 }, { month: 'Jun', ldl: 163, hdl: 47 },
]

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function SaudePreventiva() {
  const [exams] = useState<HealthExam[]>(SAMPLE_EXAMS)
  const [selectedExam, setSelectedExam] = useState<HealthExam | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'upload'>('overview')
  const [alertSending, setAlertSending] = useState(false)
  const [alertResult, setAlertResult] = useState<{ notified: boolean; alerts?: { label: string; value: number; unit: string; status: string }[]; emailsSent?: { patient: { success: boolean }; professionals: { name: string; success: boolean }[] } } | null>(null)
  const { addToast } = useToast()
  const { token } = useAuth()

  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<ExamUploadResult | null>(null)

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadResult(null)
    try {
      const result = await api.uploadExam(uploadFile)
      setUploadResult(result)
      if (result.indicators_found > 0) {
        addToast('success', `Exame analisado! ${result.indicators_found} indicador(es) extraido(s).`)
      } else {
        addToast('info', 'Exame enviado. Nao foi possivel extrair indicadores automaticamente.')
      }
      if (result.notifications?.notified) {
        addToast('success', 'Alertas enviados por email para voce e seus profissionais de saude.')
      }
      setUploadFile(null)
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao enviar exame')
    } finally {
      setUploading(false)
    }
  }

  const handleSimulateAlert = async () => {
    setAlertSending(true)
    setAlertResult(null)
    try {
      const res = await fetch(`${API_BASE}/preventive-health/simulate-alert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      setAlertResult(data)
      if (data.notified) {
        addToast('success', `Alertas enviados por email! Paciente + ${data.emailsSent?.professionals?.length || 0} profissional(is) notificados.`)
      } else {
        addToast('info', data.reason || 'Nenhum alerta gerado.')
      }
    } catch (err) {
      addToast('error', 'Erro ao simular alerta.')
    } finally {
      setAlertSending(false)
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'attention': return <Clock className="w-4 h-4 text-amber-500" />
      case 'alert': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return null
    }
  }

  const statusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-50 border-green-200'
      case 'attention': return 'bg-amber-50 border-amber-200'
      case 'alert': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Saúde Preventiva</h1>
        <p className="text-gray-500 text-sm mt-1">Monitoramento contínuo da sua saúde com apoio de IA preventiva</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'exams', label: 'Meus Exames' },
          { key: 'upload', label: 'Enviar Exame' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white shadow text-vivas-blue' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Score */}
          <div className="card bg-gradient-to-r from-wine-soft to-green-50 border border-wine-line">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-vivas-blue" />
                  Seu Score de Saúde Preventiva
                </h3>
                <p className="text-sm text-gray-600 mt-1">Baseado nos seus últimos exames e indicadores</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#7B1E3C" strokeWidth="3"
                      strokeDasharray="72 28" strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">72</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-600">Bom</p>
                  <p className="text-xs text-gray-500">Alguns pontos de atenção</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Notification System */}
          <div className="card border border-amber-200 bg-amber-50/50">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  Alertas de Saúde Preventiva
                </h3>
                <p className="text-sm text-gray-600 mt-1">Quando indicadores atingem limites de atenção, emails são enviados para você e seus profissionais de saúde</p>
              </div>
              <button
                onClick={handleSimulateAlert}
                disabled={alertSending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                {alertSending ? 'Enviando...' : 'Simular Alerta'}
              </button>
            </div>
            {alertResult && alertResult.notified && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-green-700 mb-2">Notificações enviadas com sucesso!</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>• Email enviado para: <span className="font-medium">você (paciente)</span></p>
                  {alertResult.emailsSent?.professionals?.map((prof, i) => (
                    <p key={i}>• Email enviado para: <span className="font-medium">{prof.name}</span> {prof.success ? '✓' : '✗'}</p>
                  ))}
                </div>
                {alertResult.alerts && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700 mb-1">Indicadores em alerta:</p>
                    <div className="flex flex-wrap gap-2">
                      {alertResult.alerts.map((a, i) => (
                        <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'alerta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {a.label}: {a.value} {a.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicators Grid */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Indicadores de Saúde</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {INDICATORS.map((ind, i) => (
                <div key={i} className={`p-4 rounded-xl border ${statusBg(ind.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{ind.label}</span>
                    {statusIcon(ind.status)}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-gray-900">{ind.value}</span>
                    <span className="text-sm text-gray-500 mb-0.5">{ind.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className={`w-3 h-3 ${ind.trend === 'up' ? 'text-red-400 rotate-0' : ind.trend === 'down' ? 'text-green-400 rotate-180' : 'text-gray-400 rotate-90'}`} />
                    <span className="text-xs text-gray-500">Ref: {ind.reference}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-amber-500" />
                Evolução da Glicemia
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={GLUCOSE_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[80, 120]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#EA580C" fill="#FFEDD5" strokeWidth={2} name="Glicemia (mg/dL)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700"><strong>Apoio IA:</strong> Tendência de elevação gradual. Recomenda-se aumentar atividade física e reduzir carboidratos refinados.</p>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Evolução do Peso
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={WEIGHT_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[75, 85]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2} dot={{ fill: '#16A34A' }} name="Peso (kg)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700"><strong>Apoio IA:</strong> Perda de peso progressiva e saudável. Continue com a rotina atual de exercícios.</p>
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Perfil Lipídico (Colesterol)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={CHOLESTEROL_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ldl" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626' }} name="LDL" />
                  <Line type="monotone" dataKey="hdl" stroke="#16A34A" strokeWidth={2} dot={{ fill: '#16A34A' }} name="HDL" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700"><strong>Apoio IA:</strong> LDL ainda acima do recomendado, mas com tendência de melhora. HDL subindo gradualmente. Manter dieta e exercícios.</p>
              </div>
            </div>
          </div>

          {/* AI Preventive Recommendations */}
          <div className="card bg-gradient-to-r from-vivas-green-light to-green-50 border border-vivas-green/20">
            <h3 className="font-semibold text-vivas-green-dark mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Recomendações Preventivas (Apoio IA)
            </h3>
            <p className="text-xs text-gray-500 mb-3">As recomendações abaixo são geradas como suporte preventivo e não substituem orientação médica.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/80 rounded-lg p-4 border border-green-100">
                <p className="font-semibold text-sm text-gray-800 mb-1">Atividade Física</p>
                <p className="text-xs text-gray-600">Aumentar para 200 min/semana de exercício moderado. Priorizar exercícios aeróbicos.</p>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-green-100">
                <p className="font-semibold text-sm text-gray-800 mb-1">Alimentação</p>
                <p className="text-xs text-gray-600">Reduzir carboidratos refinados. Aumentar fibras, vegetais e peixes ricos em ômega-3.</p>
              </div>
              <div className="bg-white/80 rounded-lg p-4 border border-green-100">
                <p className="font-semibold text-sm text-gray-800 mb-1">Próximos Exames</p>
                <p className="text-xs text-gray-600">Repetir glicemia e perfil lipídico em 3 meses. Vitamina D em 2 meses após suplementação.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {exams.map(exam => (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    selectedExam?.id === exam.id ? 'border-vivas-blue bg-wine-soft/50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {exam.type === 'lab' ? (
                        <div className="w-10 h-10 rounded-lg bg-wine-soft flex items-center justify-center">
                          <FileText className="w-5 h-5 text-vivas-blue" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-purple-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{exam.name}</p>
                        <p className="text-xs text-gray-500">{new Date(exam.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon(exam.status)}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        exam.status === 'normal' ? 'bg-green-100 text-green-700' :
                        exam.status === 'attention' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {exam.status === 'normal' ? 'Normal' : exam.status === 'attention' ? 'Atenção' : 'Alerta'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card h-fit sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-vivas-blue" />
                Análise Preventiva (Apoio IA)
              </h3>
              {selectedExam ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg border ${statusBg(selectedExam.status)}`}>
                    <p className="font-medium text-sm text-gray-900">{selectedExam.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(selectedExam.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="p-3 bg-wine-soft rounded-lg border border-wine-line">
                    <p className="text-sm text-gray-700">{selectedExam.aiInsight}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Esta análise é um suporte preventivo e não substitui a avaliação do seu médico.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Selecione um exame para ver a análise preventiva</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="max-w-xl mx-auto">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-vivas-blue" />
              Enviar Exame para Análise Preventiva
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Envie seus exames (PDF, imagens) e nossa IA fará uma análise preventiva como apoio ao seu acompanhamento de saúde.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-vivas-blue transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.dcm"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="exam-upload"
              />
              <label htmlFor="exam-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG ou DICOM (máx. 25MB)</p>
              </label>
            </div>

            {uploadFile && !uploading && (
              <div className="mt-4 p-3 bg-wine-soft rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-vivas-blue" />
                  <span className="text-sm font-medium text-gray-700">{uploadFile.name}</span>
                </div>
                <button
                  onClick={handleUpload}
                  className="px-4 py-1.5 bg-vivas-blue text-white rounded-lg text-sm font-medium hover:bg-wine-deep transition-colors"
                >
                  Enviar
                </button>
              </div>
            )}

            {uploading && (
              <div className="mt-4 flex items-center justify-center gap-3 p-4 bg-wine-soft rounded-lg">
                <Loader2 className="w-5 h-5 text-vivas-blue animate-spin" />
                <span className="text-sm font-medium text-vivas-blue">Enviando e analisando exame...</span>
              </div>
            )}

            {uploadResult && (
              <div className="mt-4 space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-sm text-green-800">Exame analisado com sucesso!</p>
                  <p className="text-xs text-green-700 mt-1">{uploadResult.indicators_found} indicador(es) extraido(s)</p>
                </div>
                {uploadResult.ai_analysis && (
                  <div className="p-4 bg-wine-soft border border-wine-line rounded-lg">
                    <p className="font-semibold text-sm text-gray-900 mb-2">Analise preventiva:</p>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{uploadResult.ai_analysis}</p>
                  </div>
                )}
                {uploadResult.notifications?.notified && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 font-medium">Alertas enviados por email para voce e seus profissionais de saude.</p>
                  </div>
                )}
                <button
                  onClick={() => setUploadResult(null)}
                  className="w-full px-4 py-2 bg-vivas-blue text-white rounded-lg text-sm font-medium hover:bg-wine-deep transition-colors"
                >
                  Enviar outro exame
                </button>
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">
                <strong>Importante:</strong> A analise por IA e utilizada exclusivamente como suporte preventivo e apoio ao monitoramento da sua saude.
                Nao constitui diagnostico medico. Consulte sempre seu profissional de saude para orientacoes clinicas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
