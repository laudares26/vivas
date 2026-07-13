import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Search, Stethoscope, TestTubeDiagonal, Pill, Syringe, AlertTriangle, User, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { api, type Patient, type EHREntry, type ExamComparative } from '../services/api'
import { useToast } from '../components/Toast'

const TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  consulta: { icon: Stethoscope, color: 'text-wine', bg: 'bg-wine-soft' },
  exame: { icon: TestTubeDiagonal, color: 'text-purple-600', bg: 'bg-purple-100' },
  medicamento: { icon: Pill, color: 'text-green-600', bg: 'bg-green-100' },
  vacina: { icon: Syringe, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  alergia: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
}

export default function Prontuario() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [entries, setEntries] = useState<EHREntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [comparative, setComparative] = useState<ExamComparative | null>(null)
  const [loadingComparative, setLoadingComparative] = useState(false)
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const nome = searchParams.get('nome') || ''
    const pid = searchParams.get('pid') || ''
    api.getPatients('limit=100').then(async r => {
      setPatients(r.data)
      if (nome) setSearchTerm(nome)
      // Prefer selecting by patient id (robust to duplicate names); fall back to name match.
      let match = pid ? r.data.find(p => p.id === pid) : undefined
      if (!match && nome) {
        match = r.data.find(p => p.full_name.toLowerCase() === nome.toLowerCase())
          || r.data.find(p => p.full_name.toLowerCase().includes(nome.toLowerCase()))
      }
      if (match) { setSelectedPatient(match); loadEntries(match.id); return }
      // Patient not in the list yet — fetch directly by id so the prontuário still opens.
      if (pid) {
        try {
          const p = await api.getPatient(pid)
          setPatients(prev => (prev.some(x => x.id === p.id) ? prev : [p, ...prev]))
          setSelectedPatient(p)
          loadEntries(p.id)
        } catch { /* no access */ }
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEntries = async (patientId: string) => {
    setLoading(true)
    loadComparative(patientId)
    try {
      const res = await api.getEHR(patientId)
      setEntries(res)
    } catch { addToast('error', 'Erro ao carregar prontuário') }
    finally { setLoading(false) }
  }

  const loadComparative = (patientId: string) => {
    setLoadingComparative(true)
    setComparative(null)
    api.getExamComparative({ analyze: true, patientId })
      .then(setComparative)
      .catch(() => setComparative(null))
      .finally(() => setLoadingComparative(false))
  }

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p)
    loadEntries(p.id)
  }

  const parseResultRows = (result?: string): { name: string; value: string; unit?: string }[] | null => {
    if (!result) return null
    try {
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed) && parsed.length && parsed[0] && 'name' in parsed[0]) return parsed
      return null
    } catch { return null }
  }

  const filteredPatients = patients.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cpf.includes(searchTerm) || (p.cns && p.cns.includes(searchTerm))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prontuário Eletrônico</h1>
        <p className="text-gray-500 text-sm mt-1">Histórico completo do paciente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient selector */}
        <div className="card space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Buscar paciente..." className="input-field pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {filteredPatients.map(p => (
              <button key={p.id} onClick={() => selectPatient(p)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${selectedPatient?.id === p.id ? 'bg-vivas-blue-light text-vivas-blue' : 'hover:bg-gray-50 text-gray-700'}`}>
                <p className="font-medium">{p.full_name}</p>
                <p className="text-xs text-gray-400">{p.cpf}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Patient details + timeline */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPatient ? (
            <div className="card text-center py-16">
              <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400">Selecione um paciente para ver o prontuário</p>
            </div>
          ) : (
            <>
              {/* Patient info card */}
              <div className="card !p-5 bg-gradient-to-r from-vivas-blue to-vivas-blue-dark text-white">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                    {selectedPatient.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold">{selectedPatient.full_name}</h2>
                    <div className="flex gap-3 mt-1 flex-wrap text-sm text-white/70">
                      <span>CPF: {selectedPatient.cpf}</span>
                      {selectedPatient.cns && <span className="bg-white/20 px-2 py-0.5 rounded text-xs">CNS: {selectedPatient.cns}</span>}
                      <span>{selectedPatient.gender}</span>
                      <span>{selectedPatient.blood_type}</span>
                    </div>
                  </div>
                </div>
                {selectedPatient.allergies && (
                  <div className="mt-3 p-2 bg-red-500/20 rounded-lg flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span><strong>Alergias:</strong> {selectedPatient.allergies}</span>
                  </div>
                )}
              </div>

              {/* Historical AI analysis — considers ALL of the patient's exams */}
              <div className="card">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-wine" />
                  <h3 className="font-semibold text-gray-900">Análise histórica com IA</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Evolução considerando <strong>todos os exames do paciente</strong> — não apenas o último.
                </p>
                {loadingComparative ? (
                  <div className="flex items-center gap-3 p-4 bg-wine-soft rounded-lg">
                    <Loader2 className="w-5 h-5 text-wine animate-spin" />
                    <span className="text-sm font-medium text-wine">Analisando todo o histórico de exames...</span>
                  </div>
                ) : comparative && comparative.trends.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {comparative.trends.map(t => {
                        const Icon = t.direction === 'estavel' ? Minus : (t.direction === 'subiu' ? TrendingUp : TrendingDown)
                        const color = t.worsening ? 'text-red-600' : (t.direction === 'estavel' ? 'text-gray-400' : 'text-green-600')
                        return (
                          <div key={t.name} className="flex items-center justify-between text-xs sm:text-sm border-b border-gray-100 pb-2">
                            <span className="font-medium text-gray-700">{t.label}</span>
                            <div className="flex items-center gap-2">
                              {t.first_value != null && <span className="text-gray-400">{t.first_value}→</span>}
                              <span className="font-semibold text-gray-900">{t.current_value} {t.unit}</span>
                              {t.count > 1 && <span className="text-gray-400">({t.count} exames)</span>}
                              <span className={`flex items-center gap-0.5 ${color}`}>
                                <Icon className="w-3.5 h-3.5" />
                                {t.delta_pct != null && t.direction !== 'estavel' ? `${t.delta_pct > 0 ? '+' : ''}${t.delta_pct}%` : ''}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {comparative.analysis ? (
                      <div className="p-4 bg-wine-soft border border-wine-line rounded-lg">
                        <p className="font-semibold text-sm text-gray-900 mb-2">Interpretação preventiva (todo o histórico):</p>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{comparative.analysis}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Análise textual indisponível no momento.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">Sem exames com indicadores para este paciente.</p>
                )}
              </div>

              {/* Timeline */}
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Linha do Tempo</h3>
                {loading ? (
                  <div className="flex items-center justify-center h-32"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
                ) : entries.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Nenhum registro encontrado</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-6">
                      {entries.map(entry => {
                        const config = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG.consulta
                        const Icon = config.icon
                        const rows = entry.entry_type === 'exame' ? parseResultRows(entry.metadata?.result) : null
                        return (
                          <div key={entry.id} className="relative flex gap-4 pl-2">
                            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center z-10 flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 pb-2 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-medium text-gray-900 text-sm">{entry.title}</h4>
                                <span className={`badge ${config.bg} ${config.color}`}>{entry.entry_type}</span>
                              </div>
                              {rows ? (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {rows.map((r, i) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded capitalize">
                                      {r.name.replace(/_/g, ' ')}: <strong>{r.value}</strong>{r.unit ? ` ${r.unit}` : ''}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-600 break-words">{entry.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">{new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
