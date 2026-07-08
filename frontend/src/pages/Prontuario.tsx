import { useEffect, useState } from 'react'
import { FileText, Search, Stethoscope, TestTubeDiagonal, Pill, Syringe, AlertTriangle, User } from 'lucide-react'
import { api, type Patient, type EHREntry } from '../services/api'
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
  const { addToast } = useToast()

  useEffect(() => {
    api.getPatients('limit=100').then(r => setPatients(r.data)).catch(() => {})
  }, [])

  const loadEntries = async (patientId: string) => {
    setLoading(true)
    try {
      const res = await api.getEHR(patientId)
      setEntries(res)
    } catch { addToast('error', 'Erro ao carregar prontuário') }
    finally { setLoading(false) }
  }

  const selectPatient = (p: Patient) => {
    setSelectedPatient(p)
    loadEntries(p.id)
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
                        return (
                          <div key={entry.id} className="relative flex gap-4 pl-2">
                            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center z-10 flex-shrink-0`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 text-sm">{entry.title}</h4>
                                <span className={`badge ${config.bg} ${config.color}`}>{entry.entry_type}</span>
                              </div>
                              <p className="text-sm text-gray-600">{entry.description}</p>
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
