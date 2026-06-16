import { useEffect, useState, useRef } from 'react'
import { Users, CalendarDays, AlertTriangle, Clock, TrendingUp, ArrowUpRight, Bell, Camera, Upload, FileText, CheckCircle, XCircle, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api, type DashboardData } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadState, setUploadState] = useState<'idle' | 'preview' | 'analyzing' | 'done'>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageQuality, setImageQuality] = useState<'good' | 'bad' | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string)
      setUploadState('preview')
      analyzeImageQuality(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const analyzeImageQuality = (dataUrl: string) => {
    setUploadState('analyzing')
    const img = new Image()
    img.onload = () => {
      // Simple quality check: resolution, aspect ratio, brightness
      const isGoodResolution = img.width >= 300 && img.height >= 300
      const isReasonableAspect = img.width / img.height < 5 && img.height / img.width < 5
      const canvas = document.createElement('canvas')
      canvas.width = Math.min(img.width, 100)
      canvas.height = Math.min(img.height, 100)
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
      let brightness = 0
      if (imageData) {
        for (let i = 0; i < imageData.data.length; i += 4) {
          brightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
        }
        brightness /= (imageData.data.length / 4)
      }
      const isGoodBrightness = brightness > 40 && brightness < 240
      const isGood = isGoodResolution && isReasonableAspect && isGoodBrightness
      setImageQuality(isGood ? 'good' : 'bad')
      setUploadState('done')
    }
    img.src = dataUrl
  }

  const resetUpload = () => {
    setUploadState('idle')
    setCapturedImage(null)
    setImageQuality(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
  if (!data) return <div className="text-center py-12 text-gray-500">Erro ao carregar dashboard</div>

  const weeklyData = data.weeklyStats?.length > 0
    ? data.weeklyStats.map(w => ({ name: w.day, atendimentos: parseInt(String(w.count)) }))
    : [{ name: 'Seg', atendimentos: 8 }, { name: 'Ter', atendimentos: 12 }, { name: 'Qua', atendimentos: 15 },
       { name: 'Qui', atendimentos: 10 }, { name: 'Sex', atendimentos: 18 }, { name: 'Sáb', atendimentos: 6 }]

  const isProfessional = ['medico', 'psicologo'].includes(user?.role || '')
  const isPatient = user?.role === 'paciente'

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bem-vindo, {user?.full_name}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isProfessional ? 'Resumo dos seus atendimentos e alertas' : isPatient ? 'Acompanhe sua saúde e exames' : 'Resumo geral da unidade de saúde'}
        </p>
      </div>

      {/* KPI Cards - personalized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-vivas-blue" />
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-vivas-blue">
              <ArrowUpRight className="w-3.5 h-3.5" />
              total
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.personalStats?.totalConsultations || 0}</p>
          <p className="text-sm text-gray-500 mt-0.5">Consultas Realizadas</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-vivas-green" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900">
            {data.personalStats?.lastConsultation
              ? new Date(data.personalStats.lastConsultation).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              : 'Nenhuma'}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">Última Consulta</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.kpis.appointmentsToday}</p>
          <p className="text-sm text-gray-500 mt-0.5">Atendimentos Hoje</p>
        </div>

        <div className="card relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            {(data.healthAlerts?.unread || 0) > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {data.healthAlerts.unread}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.healthAlerts?.total || 0}</p>
          <p className="text-sm text-gray-500 mt-0.5">Alertas de Saúde</p>
          {(data.healthAlerts?.unread || 0) > 0 && (
            <p className="text-xs text-red-500 mt-0.5 font-medium">{data.healthAlerts.unread} não lido(s)</p>
          )}
        </div>
      </div>

      {/* Health Alerts Section */}
      {(data.healthAlerts?.recent?.length || 0) > 0 && (
        <div className="card border-l-4 border-l-red-500">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alertas de Saúde Recentes
            {(data.healthAlerts?.unread || 0) > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {data.healthAlerts.unread} novo(s)
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {data.healthAlerts.recent.map(alert => (
              <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg ${alert.read_by_patient && alert.read_by_professional ? 'bg-gray-50' : 'bg-red-50'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.read_by_patient && alert.read_by_professional ? 'bg-gray-400' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {alert.patient_name ? `${alert.patient_name} - ` : ''}
                    {(alert.indicator_name || '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    Valor: {alert.value} (limite: {alert.threshold}) - {new Date(alert.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium flex-shrink-0">
                  {alert.severity || 'Alto'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fique em dia com seus exames + Upload */}
      {(isPatient || isProfessional) && (
        <div className="card border-l-4 border-l-vivas-green">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-vivas-green" />
            Fique em dia com seus exames
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {isPatient ? 'Envie seus exames para acompanhamento preventivo. Use a câmera ou faça upload do arquivo.' : 'Acompanhe os exames dos seus pacientes.'}
          </p>

          {isPatient && uploadState === 'idle' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-vivas-blue text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Tirar Foto do Exame
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture')
                    fileInputRef.current.click()
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-vivas-blue text-vivas-blue rounded-xl font-medium hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Upload de Arquivo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {uploadState === 'analyzing' && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="animate-spin w-5 h-5 border-2 border-vivas-blue border-t-transparent rounded-full" />
              <p className="text-sm text-vivas-blue font-medium">Analisando qualidade da imagem...</p>
            </div>
          )}

          {uploadState === 'done' && capturedImage && (
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <img src={capturedImage} alt="Exame" className="w-24 h-24 object-cover rounded-lg border" />
                <div className="flex-1">
                  {imageQuality === 'good' ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <div>
                        <p className="font-medium text-sm">Imagem com boa qualidade!</p>
                        <p className="text-xs text-green-600">A foto está legível e pode ser enviada.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                      <XCircle className="w-5 h-5" />
                      <div>
                        <p className="font-medium text-sm">Qualidade insuficiente</p>
                        <p className="text-xs text-amber-600">A imagem pode estar escura, borrada ou com baixa resolução. Tente novamente.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {imageQuality === 'good' && (
                  <button onClick={resetUpload} className="flex-1 px-4 py-2 bg-vivas-green text-white rounded-lg font-medium text-sm hover:bg-green-700">
                    Enviar Exame
                  </button>
                )}
                <button onClick={resetUpload} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50">
                  {imageQuality === 'good' ? 'Cancelar' : 'Tentar Novamente'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Chart */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-vivas-blue" />
          Atendimentos - Últimos 7 dias
        </h3>
        <p className="text-xs text-gray-400 mb-4">Frequência diária de atendimentos</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="atendimentos" stroke="#0057B8" strokeWidth={2.5} dot={{ fill: '#0057B8', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
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
                  <th className="pb-3 font-medium hidden sm:table-cell">Profissional</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Especialidade</th>
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
                          {apt.patient_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{apt.patient_name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600 hidden sm:table-cell">{apt.professional_name}</td>
                    <td className="py-3 hidden md:table-cell"><span className="badge-sus">{apt.specialty || 'Geral'}</span></td>
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

      {/* Admin-only: patients & professionals count */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-vivas-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.kpis.totalPatients}</p>
                <p className="text-sm text-gray-500">Pacientes Ativos</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-vivas-green" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.kpis.totalProfessionals}</p>
                <p className="text-sm text-gray-500">Profissionais</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
