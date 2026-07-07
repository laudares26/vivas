import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Calendar, FileText, User, Bell, Camera, Upload, ChevronRight, TrendingUp, Heart, Video, CreditCard, CheckCircle, XCircle, Loader2, MessageCircle } from 'lucide-react'
import { api, type DashboardData, type ExamUploadResult } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function PatientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadState, setUploadState] = useState<'idle' | 'preview' | 'analyzing' | 'done' | 'uploading' | 'result'>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [imageQuality, setImageQuality] = useState<'good' | 'bad' | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<ExamUploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showCarteirinha, setShowCarteirinha] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setUploadError(null)
    setUploadResult(null)

    // PDFs cannot be analyzed as images — skip quality check
    if (file.type === 'application/pdf') {
      setCapturedImage(null)
      setImageQuality('good')
      setUploadState('done')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string)
      setUploadState('preview')
      analyzeImageQuality(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSendExam = async () => {
    if (!selectedFile) return
    setUploadState('uploading')
    setUploadError(null)
    try {
      const result = await api.uploadExam(selectedFile)
      setUploadResult(result)
      setUploadState('result')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erro ao enviar exame')
      setUploadState('done')
    }
  }

  const analyzeImageQuality = (dataUrl: string) => {
    setUploadState('analyzing')
    const img = new Image()
    img.onload = () => {
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
      setImageQuality(isGoodResolution && isReasonableAspect && isGoodBrightness ? 'good' : 'bad')
      setUploadState('done')
    }
    img.src = dataUrl
  }

  const resetUpload = () => {
    setUploadState('idle')
    setCapturedImage(null)
    setImageQuality(null)
    setSelectedFile(null)
    setUploadResult(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="animate-spin w-8 h-8 border-4 border-wine border-t-transparent rounded-full" />
    </div>
  )

  const firstName = user?.full_name?.split(' ')[0] || 'Paciente'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia,' : hour < 18 ? 'Boa tarde,' : 'Boa noite,'
  const healthScore = 82
  const scoreColor = healthScore >= 70 ? '#2F8F6B' : healthScore >= 40 ? '#B5751A' : '#DC2626'
  const circumference = 2 * Math.PI * 36
  const dashOffset = circumference * (1 - healthScore / 100)

  return (
    <div className="min-h-screen bg-bg" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* TOP BAR */}
      <header
        className="relative overflow-hidden bg-gradient-to-br from-wine to-wine-deep text-white pb-6 px-6 rounded-b-3xl"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top) + 0.75rem))' }}
      >
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </span>
            <span className="font-display font-extrabold text-lg">VivaS</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/saude-preventiva')} className="relative" aria-label="Notificacoes">
              <Bell className="w-5 h-5 text-white/90" />
              {(data?.healthAlerts?.unread || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-wine" />
              )}
            </button>
            <button onClick={() => navigate('/configuracoes')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {firstName.substring(0, 2).toUpperCase()}
            </button>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-white/70 text-sm">{greeting}</p>
          <p className="font-display font-extrabold text-2xl mt-0.5">{firstName}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm text-white/80">Plano Família &middot; em dia</span>
          </div>
        </div>
      </header>

      {/* HERO: Triagem */}
      <section className="px-5 -mt-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <h2 className="font-display font-extrabold text-lg text-ink">Como você está hoje?</h2>
          <p className="text-sm text-muted mt-1">Conte o que sente e a Vivi (nossa IA) te orienta em segundos.</p>
          <button onClick={() => navigate('/vivi')} className="mt-4 w-full bg-gradient-to-r from-wine to-wine-deep text-white rounded-2xl px-5 py-4 flex items-center justify-between transition-transform hover:scale-[1.01]">
            <span className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
              </span>
              <span className="text-left">
                <span className="font-display font-bold text-sm block">Iniciar triagem</span>
                <span className="text-xs text-white/70 block">Resolve a maioria sem sair de casa</span>
              </span>
            </span>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </section>

      <div className="px-5 pb-24 space-y-5 mt-5">
        {/* ÍNDICE DE SAÚDE */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-extrabold text-base text-ink">Seu índice de saúde</h3>
            <button onClick={() => navigate('/saude-preventiva')} className="text-wine text-sm font-semibold">Detalhes</button>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="36" stroke="#F0E7EA" strokeWidth="9" fill="none"/>
                <circle cx="42" cy="42" r="36" stroke={scoreColor} strokeWidth="9" fill="none"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                  transform="rotate(-90 42 42)" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display font-extrabold text-2xl text-ink">{healthScore}</span>
                <span className="text-xs text-muted font-semibold">de 100</span>
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-ink">Saúde em dia</h4>
              <p className="text-xs text-muted mt-1">Baseado nos seus exames, hábitos e histórico.</p>
              <span className="inline-flex items-center gap-1.5 mt-2 bg-success-soft text-success text-xs font-semibold px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +4 nos últimos 30 dias
              </span>
            </div>
          </div>
        </section>

        {/* PRECISA DA SUA ATENÇÃO */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-extrabold text-base text-ink">Precisa da sua atenção</h3>
            <button onClick={() => navigate('/saude-preventiva')} className="text-wine text-sm font-semibold">Ver tudo</button>
          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-xl bg-success-soft text-success flex items-center justify-center flex-shrink-0">
                <Video className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink">Teleconsulta com Dr. Bruno Hodos</p>
                <p className="text-xs text-muted mt-0.5">Hoje, 14:30 &middot; Clínica Geral</p>
              </div>
              <button onClick={() => navigate('/teleconsulta')} className="bg-wine text-white text-xs font-display font-bold px-3.5 py-2 rounded-xl whitespace-nowrap">Entrar</button>
            </div>

            <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-xl bg-wine-soft text-wine flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink">
                  Hemograma <span className="text-xs font-bold text-success bg-success-soft px-2 py-0.5 rounded-full ml-1">IA pronta</span>
                </p>
                <p className="text-xs text-muted mt-0.5">Interpretação explicada em linguagem simples</p>
              </div>
              <button onClick={() => navigate('/saude-preventiva')} className="bg-wine-soft text-wine text-xs font-display font-bold px-3.5 py-2 rounded-xl whitespace-nowrap">Ver</button>
            </div>

            <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-xl bg-warning-soft text-warning flex items-center justify-center flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3c0 1.5 1 2 1 4H8a3 3 0 0 0 0 6h1l1 7h4l1-7h1a3 3 0 0 0 0-6h-2c0-2 1-2.5 1-4a3 3 0 0 0-3-3z"/></svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink">Check-up preventivo anual</p>
                <p className="text-xs text-muted mt-0.5">Recomendado há 11 meses &middot; gratuito no seu plano</p>
              </div>
              <button onClick={() => navigate('/agendamentos')} className="bg-wine-soft text-wine text-xs font-display font-bold px-3.5 py-2 rounded-xl whitespace-nowrap">Agendar</button>
            </div>
          </div>
        </section>

        {/* UPLOAD DE EXAMES */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-extrabold text-base text-ink">Fique em dia com seus exames</h3>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5">
            {uploadState === 'idle' && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment')
                      fileInputRef.current.click()
                    }
                  }}
                  className="flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-wine text-white rounded-2xl font-display font-bold text-sm"
                >
                  <Camera className="w-6 h-6" />
                  Tirar Foto
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture')
                      fileInputRef.current.click()
                    }
                  }}
                  className="flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-wine-soft text-wine rounded-2xl font-display font-bold text-sm"
                >
                  <Upload className="w-6 h-6" />
                  Upload
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
              </div>
            )}
            {uploadState === 'analyzing' && (
              <div className="flex items-center gap-3 p-4 bg-wine-soft rounded-xl">
                <div className="animate-spin w-5 h-5 border-2 border-wine border-t-transparent rounded-full" />
                <p className="text-sm text-wine font-medium">Analisando qualidade...</p>
              </div>
            )}
            {uploadState === 'done' && (capturedImage || selectedFile) && (
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Exame" className="w-20 h-20 object-cover rounded-xl border border-line" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-line bg-wine-soft flex items-center justify-center">
                      <FileText className="w-8 h-8 text-wine" />
                    </div>
                  )}
                  <div className="flex-1">
                    {imageQuality === 'good' ? (
                      <div className="flex items-center gap-2 text-success bg-success-soft p-3 rounded-xl">
                        <CheckCircle className="w-5 h-5" />
                        <div>
                          <p className="font-semibold text-sm">{capturedImage ? 'Imagem com boa qualidade!' : `PDF pronto: ${selectedFile?.name}`}</p>
                          <p className="text-xs opacity-80">Pronto para enviar.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-warning bg-warning-soft p-3 rounded-xl">
                        <XCircle className="w-5 h-5" />
                        <div>
                          <p className="font-semibold text-sm">Qualidade insuficiente</p>
                          <p className="text-xs opacity-80">Tente novamente com melhor iluminação.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {uploadError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl mt-2">
                    <XCircle className="w-5 h-5" />
                    <p className="text-sm">{uploadError}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={resetUpload} className="flex-1 px-4 py-2.5 bg-wine-soft text-wine rounded-xl font-display font-bold text-sm">
                    {imageQuality === 'bad' ? 'Tentar novamente' : 'Nova foto'}
                  </button>
                  {imageQuality === 'good' && (
                    <button onClick={handleSendExam} className="flex-1 px-4 py-2.5 bg-wine text-white rounded-xl font-display font-bold text-sm">
                      Enviar exame
                    </button>
                  )}
                </div>
              </div>
            )}
            {uploadState === 'uploading' && (
              <div className="flex flex-col items-center gap-3 p-6">
                <Loader2 className="w-8 h-8 text-wine animate-spin" />
                <p className="text-sm text-wine font-semibold">Enviando e analisando seu exame...</p>
                <p className="text-xs text-muted">A IA esta extraindo indicadores do seu exame</p>
              </div>
            )}
            {uploadState === 'result' && uploadResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-success bg-success-soft p-3 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-sm">Exame enviado e analisado!</p>
                    <p className="text-xs opacity-80">{uploadResult.indicators_found} indicador(es) extraido(s)</p>
                  </div>
                </div>
                {uploadResult.ai_analysis && (
                  <div className="bg-wine-soft p-4 rounded-xl">
                    <p className="font-semibold text-sm text-wine mb-2">Analise preventiva:</p>
                    <p className="text-xs text-ink whitespace-pre-line leading-relaxed">{uploadResult.ai_analysis}</p>
                  </div>
                )}
                {uploadResult.notifications?.notified && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <p className="text-xs text-amber-800 font-medium">Notificacoes enviadas para voce e seu(s) profissional(is) de saude por email.</p>
                  </div>
                )}
                <button onClick={resetUpload} className="w-full px-4 py-2.5 bg-wine text-white rounded-xl font-display font-bold text-sm">
                  Enviar outro exame
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ACESSO RÁPIDO */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-extrabold text-base text-ink">Acesso rápido</h3>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Calendar, label: 'Agendar consulta', action: () => navigate('/agendamentos') },
              { icon: Video, label: 'Teleconsulta', action: () => navigate('/teleconsulta') },
              { icon: FileText, label: 'Meus exames', action: () => navigate('/saude-preventiva') },
              { icon: Heart, label: 'Saúde mental', action: () => navigate('/mental') },
              { icon: CreditCard, label: 'Carteirinha', action: () => setShowCarteirinha(true) },
              { icon: MessageCircle, label: 'Vivi', action: () => navigate('/vivi') },
            ].map((item, i) => (
              <button key={i} onClick={item.action} className="bg-white rounded-2xl shadow-card p-3.5 text-center border border-transparent hover:border-wine-line hover:-translate-y-0.5 transition-all">
                <span className="w-10 h-10 rounded-xl bg-wine-soft text-wine flex items-center justify-center mx-auto mb-2">
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-semibold text-ink block leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* LINHA DO TEMPO */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-extrabold text-base text-ink">Sua linha do tempo</h3>
            <button onClick={() => navigate('/saude-preventiva')} className="text-wine text-sm font-semibold">Ver completa</button>
          </div>
          <div className="bg-white rounded-2xl shadow-card px-4 py-1">
            {[
              { color: 'bg-success', title: 'Hemograma realizado', sub: 'Lab. Hermes Pardini · resultado disponível', date: 'Ontem' },
              { color: 'bg-wine', title: 'Triagem: dor de cabeça', sub: 'Resolvida pela Vivi · orientação enviada', date: '3 jun' },
              { color: 'bg-gray-300', title: 'Teleconsulta · Clínica Geral', sub: 'Dr. Bruno Hodos · receita emitida', date: '28 mai' },
            ].map((item, i, arr) => (
              <div key={i} className={`flex gap-3.5 py-3.5 ${i < arr.length - 1 ? 'border-b border-line' : ''}`}>
                <div className="relative flex flex-col items-center pt-1">
                  <span className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                  {i < arr.length - 1 && <span className="w-0.5 flex-1 bg-line mt-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">{item.title}</p>
                  <p className="text-xs text-muted mt-0.5">{item.sub}</p>
                </div>
                <span className="text-xs text-muted font-medium whitespace-nowrap pt-1">{item.date}</span>
              </div>
            ))}
          </div>
        </section>

        {/* MEU PLANO */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-extrabold text-base text-ink">Meu plano</h3>
          </div>
          <div className="bg-gradient-to-br from-[#3A1020] to-wine-deep text-white rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/60 font-bold">VivaS</p>
                <p className="font-display font-extrabold text-xl mt-0.5">Família</p>
              </div>
              <span className="flex items-center gap-1.5 bg-green-400/20 text-green-300 text-xs font-bold px-2.5 py-1 rounded-full">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                Pagamento em dia
              </span>
            </div>
            <div className="flex justify-between mt-5 pt-4 border-t border-white/10">
              <div><p className="text-xs text-white/60">Mensalidade</p><p className="text-sm font-semibold mt-0.5">R$ 89,90</p></div>
              <div><p className="text-xs text-white/60">Próxima cobrança</p><p className="text-sm font-semibold mt-0.5">10/07/2026</p></div>
              <div><p className="text-xs text-white/60">Teleconsultas</p><p className="text-sm font-semibold mt-0.5">Ilimitadas</p></div>
            </div>
            <button onClick={() => setShowCarteirinha(true)} className="mt-4 w-full bg-white/10 border border-white/15 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-display font-bold text-sm">
              <CreditCard className="w-4 h-4" />
              Carteirinha digital
            </button>
          </div>
        </section>
      </div>

      {/* CARTEIRINHA DIGITAL MODAL */}
      {showCarteirinha && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCarteirinha(false)}>
          <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {/* Titular */}
            <div className="bg-gradient-to-br from-[#3A1020] to-wine-deep text-white rounded-2xl p-6 shadow-2xl mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Carteirinha Digital</p>
                  <p className="font-display font-extrabold text-lg mt-1">VivaS Saude</p>
                </div>
                <Heart className="w-8 h-8 text-white/30" />
              </div>
              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-[10px] uppercase text-white/50">Titular</p>
                  <p className="font-display font-bold text-base">{user?.full_name || 'Paciente'}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] uppercase text-white/50">Email</p>
                    <p className="text-sm font-medium">{user?.email || ''}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-white/50">Plano</p>
                    <p className="text-sm font-medium">Familia</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] uppercase text-white/50">N. Carteirinha</p>
                    <p className="text-sm font-mono font-medium">{user?.id?.slice(0, 8).toUpperCase() || '00000000'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-white/50">Validade</p>
                    <p className="text-sm font-medium">12/2027</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <p className="text-[10px] text-white/40">vivas.digital</p>
                <span className="bg-green-400/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Ativo</span>
              </div>
            </div>

            {/* Dependentes */}
            {data?.dependentes && data.dependentes.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-white/80 text-center">Dependentes</p>
                {data.dependentes.map((dep: {name: string; cpf?: string}, idx: number) => (
                  <div key={idx} className="bg-gradient-to-br from-[#4A1F30] to-wine text-white rounded-xl p-4 shadow-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] uppercase text-white/50">Dependente</p>
                        <p className="font-display font-bold text-sm">{dep.name}</p>
                      </div>
                      <span className="bg-green-400/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Ativo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowCarteirinha(false)} className="mt-4 w-full bg-white text-wine rounded-xl py-3 font-display font-bold text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-line flex justify-around py-3 pb-safe z-50" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        {[
          { icon: Home, label: 'Início', path: '/' },
          { icon: Calendar, label: 'Agenda', path: '/agendamentos' },
          { icon: MessageCircle, label: 'Vivi', path: '/vivi' },
          { icon: FileText, label: 'Saúde', path: '/saude-preventiva' },
          { icon: User, label: 'Perfil', path: '/configuracoes' },
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)} className={`flex flex-col items-center gap-1 text-xs font-semibold ${item.path === '/' ? 'text-wine' : 'text-muted'}`}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
