import { useEffect, useState } from 'react'
import { Plus, Search, Sparkles } from 'lucide-react'
import { api, type Exam, type Patient, type Professional } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  solicitado: { label: 'Solicitado', color: 'bg-wine-soft text-wine' },
  coletado: { label: 'Coletado', color: 'bg-yellow-100 text-yellow-700' },
  em_analise: { label: 'Em Análise', color: 'bg-purple-100 text-purple-700' },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
}

export default function Exames() {
  const [exams, setExams] = useState<Exam[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailExam, setDetailExam] = useState<Exam | null>(null)
  const [form, setForm] = useState({ patient_id: '', professional_id: '', loinc_code: '', exam_name: '', category: 'Laboratorial' })
  const { addToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      const res = await api.getExams(params.toString())
      setExams(res)
    } catch { addToast('error', 'Erro ao carregar exames') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])
  useEffect(() => {
    Promise.all([
      api.getPatients('limit=100').then(r => setPatients(r.data)),
      api.getProfessionals('category=Médico').then(setProfessionals),
    ]).catch(() => {})
  }, [])

  const handleCreate = async () => {
    try {
      await api.createExam(form as Partial<Exam>)
      addToast('success', 'Exame solicitado')
      setModalOpen(false); load()
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro') }
  }

  const filteredExams = exams.filter(e =>
    !search || e.exam_name.toLowerCase().includes(search.toLowerCase()) || e.patient_name?.toLowerCase().includes(search.toLowerCase())
  )

  // Result may be a JSON array of { name, value, unit } or plain text.
  const parseResult = (result: string): { name: string; value: string; unit?: string }[] | null => {
    try {
      const parsed = JSON.parse(result)
      if (Array.isArray(parsed) && parsed.length && parsed[0] && 'name' in parsed[0]) return parsed
      return null
    } catch { return null }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exames e Laudos</h1>
          <p className="text-gray-500 text-sm mt-1">{exams.length} exames</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Solicitar Exame
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input placeholder="Buscar exame ou paciente..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field !w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="solicitado">Solicitado</option>
          <option value="coletado">Coletado</option>
          <option value="em_analise">Em Análise</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map(exam => {
            const status = STATUS_MAP[exam.status] || STATUS_MAP.solicitado
            return (
              <button
                type="button"
                key={exam.id}
                onClick={() => setDetailExam(exam)}
                className="card text-left w-full cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-wine"
              >
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{exam.exam_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{exam.patient_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`badge ${status.color}`}>{status.label}</span>
                    {exam.ai_analysis && (
                      <span className="badge bg-gradient-to-r from-wine to-wine-deep text-white flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Análise
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap text-xs">
                  {exam.loinc_code && <span className="badge-loinc">LOINC: {exam.loinc_code}</span>}
                  <span className="badge bg-gray-100 text-gray-600">{exam.category}</span>
                </div>
                {exam.result && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                    <p className="font-medium text-green-800 line-clamp-2">Resultado: {exam.result}</p>
                    <p className="text-wine text-xs mt-1 font-medium">Toque para ver detalhes</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">Solicitado em {new Date(exam.created_at).toLocaleDateString('pt-BR')}</p>
              </button>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Solicitar Exame">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
            <select className="input-field" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
              <option value="">Selecione</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Médico Solicitante *</label>
            <select className="input-field" value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}>
              <option value="">Selecione</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Exame *</label>
            <input className="input-field" value={form.exam_name} onChange={e => setForm(f => ({ ...f, exam_name: e.target.value }))} placeholder="Ex: Hemograma Completo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código LOINC <span className="badge-loinc ml-1">LOINC</span></label>
              <input className="input-field" value={form.loinc_code} onChange={e => setForm(f => ({ ...f, loinc_code: e.target.value }))} placeholder="Ex: 718-7" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option>Laboratorial</option><option>Imagem</option><option>Funcional</option><option>Patológico</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
          <button onClick={handleCreate} className="btn-primary">Solicitar</button>
        </div>
      </Modal>

      <Modal open={!!detailExam} onClose={() => setDetailExam(null)} title={detailExam?.exam_name || 'Exame'}>
        {detailExam && (() => {
          const status = STATUS_MAP[detailExam.status] || STATUS_MAP.solicitado
          const rows = detailExam.result ? parseResult(detailExam.result) : null
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${status.color}`}>{status.label}</span>
                <span className="badge bg-gray-100 text-gray-600">{detailExam.category}</span>
                {detailExam.loinc_code && <span className="badge-loinc">LOINC: {detailExam.loinc_code}</span>}
              </div>
              <div className="text-sm text-gray-600">
                <p><span className="font-medium text-gray-800">Paciente:</span> {detailExam.patient_name}</p>
                {detailExam.professional_name && <p><span className="font-medium text-gray-800">Solicitante:</span> {detailExam.professional_name}</p>}
                <p><span className="font-medium text-gray-800">Solicitado em:</span> {new Date(detailExam.created_at).toLocaleDateString('pt-BR')}</p>
                {detailExam.result_date && <p><span className="font-medium text-gray-800">Resultado em:</span> {new Date(detailExam.result_date).toLocaleDateString('pt-BR')}</p>}
              </div>

              {detailExam.result ? (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Resultado</h4>
                  {rows ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500">
                            <th className="px-3 py-2 font-medium">Indicador</th>
                            <th className="px-3 py-2 font-medium">Valor</th>
                            <th className="px-3 py-2 font-medium">Unidade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2 text-gray-800 capitalize">{r.name.replace(/_/g, ' ')}</td>
                              <td className="px-3 py-2 font-medium text-gray-900">{r.value}</td>
                              <td className="px-3 py-2 text-gray-500">{r.unit || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg whitespace-pre-wrap break-words">{detailExam.result}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Resultado ainda não disponível.</p>
              )}

              {detailExam.ai_analysis && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-wine" /> Análise
                  </h4>
                  <p className="text-sm text-gray-700 bg-wine-soft p-3 rounded-lg whitespace-pre-wrap break-words">{detailExam.ai_analysis}</p>
                </div>
              )}

              {detailExam.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Observações</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{detailExam.notes}</p>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
