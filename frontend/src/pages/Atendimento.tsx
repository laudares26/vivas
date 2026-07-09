import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Plus, HeartPulse, Thermometer, Wind, Droplets } from 'lucide-react'
import { api, type MedicalRecord, type Patient, type Professional } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

const MANCHESTER = [
  { color: 'vermelho', label: 'Emergência', bg: 'bg-red-600', text: 'text-white', border: 'border-red-600' },
  { color: 'laranja', label: 'Muito Urgente', bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-500' },
  { color: 'amarelo', label: 'Urgente', bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-400' },
  { color: 'verde', label: 'Pouco Urgente', bg: 'bg-green-500', text: 'text-white', border: 'border-green-500' },
  { color: 'azul', label: 'Não Urgente', bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-500' },
]

export default function Atendimento() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    patient_id: '', professional_id: '', chief_complaint: '', manchester_priority: 'verde',
    systolic_bp: '', diastolic_bp: '', heart_rate: '', temperature: '', respiratory_rate: '',
    spo2: '', weight: '', height: '', icd10_code: '', icd10_description: '', diagnosis: '', conduct: '',
  })

  useEffect(() => {
    Promise.all([
      api.getMedicalRecords().then(setRecords),
      api.getPatients('limit=100').then(r => setPatients(r.data)),
      api.getProfessionals('category=Médico').then(setProfessionals),
    ]).catch(() => addToast('error', 'Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    try {
      await api.createMedicalRecord({
        ...form,
        systolic_bp: Number(form.systolic_bp) || undefined,
        diastolic_bp: Number(form.diastolic_bp) || undefined,
        heart_rate: Number(form.heart_rate) || undefined,
        temperature: Number(form.temperature) || undefined,
        respiratory_rate: Number(form.respiratory_rate) || undefined,
        spo2: Number(form.spo2) || undefined,
        weight: Number(form.weight) || undefined,
        height: Number(form.height) || undefined,
      } as Partial<MedicalRecord>)
      addToast('success', 'Atendimento registrado')
      setModalOpen(false)
      const res = await api.getMedicalRecords()
      setRecords(res)
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro') }
  }

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const getManchester = (color: string) => MANCHESTER.find(m => m.color === color) || MANCHESTER[3]

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atendimento Médico</h1>
          <p className="text-gray-500 text-sm mt-1">Fila de atendimento e registro clínico</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Atendimento
        </button>
      </div>

      {/* Manchester Queue */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {MANCHESTER.map(m => {
          const count = records.filter(r => r.manchester_priority === m.color).length
          return (
            <div key={m.color} className={`rounded-xl p-2 sm:p-4 ${m.bg} ${m.text} text-center flex flex-col items-center justify-center min-w-0`}>
              <p className="text-xl sm:text-2xl font-bold leading-none">{count}</p>
              <p className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight mt-1 break-words hyphens-auto">{m.label}</p>
            </div>
          )
        })}
      </div>

      {/* Records */}
      <div className="space-y-3">
        {records.map(record => {
          const m = getManchester(record.manchester_priority)
          return (
            <div key={record.id} className={`card !p-4 border-l-4 ${m.border}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/prontuario?nome=${encodeURIComponent(record.patient_name || '')}`)}
                      className="font-semibold text-gray-900 hover:text-wine hover:underline focus:outline-none focus:ring-2 focus:ring-wine rounded"
                    >
                      {record.patient_name}
                    </button>
                    <span className={`badge ${m.bg} ${m.text}`}>{m.label}</span>
                    {record.icd10_code && <span className="badge-cid">CID-10: {record.icd10_code}</span>}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{record.chief_complaint}</p>
                  <p className="text-xs text-gray-500">Dr(a). {record.professional_name} • {new Date(record.date_time).toLocaleString('pt-BR')}</p>
                </div>

                {/* Vital Signs */}
                <div className="flex gap-4 text-xs text-gray-600 flex-wrap">
                  {record.systolic_bp && (
                    <div className="flex items-center gap-1"><HeartPulse className="w-3.5 h-3.5 text-red-500" /><span>{record.systolic_bp}/{record.diastolic_bp}</span></div>
                  )}
                  {record.heart_rate && (
                    <div className="flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5 text-pink-500" /><span>{record.heart_rate} bpm</span></div>
                  )}
                  {record.temperature && (
                    <div className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-amber-500" /><span>{Number(record.temperature).toFixed(1)}°C</span></div>
                  )}
                  {record.spo2 && (
                    <div className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5 text-blue-500" /><span>SpO₂ {record.spo2}%</span></div>
                  )}
                  {record.respiratory_rate && (
                    <div className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-cyan-500" /><span>{record.respiratory_rate} irpm</span></div>
                  )}
                </div>
              </div>
              {record.diagnosis && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700">
                  <strong>Diagnóstico:</strong> {record.diagnosis}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Atendimento" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              <select className="input-field" value={form.patient_id} onChange={e => updateForm('patient_id', e.target.value)}>
                <option value="">Selecione</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
              <select className="input-field" value={form.professional_id} onChange={e => updateForm('professional_id', e.target.value)}>
                <option value="">Selecione</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name} - {p.specialty}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Classificação Manchester *</label>
            <div className="flex gap-2">
              {MANCHESTER.map(m => (
                <button key={m.color} onClick={() => updateForm('manchester_priority', m.color)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${form.manchester_priority === m.color ? `${m.bg} ${m.text} ring-2 ring-offset-2` : 'bg-gray-100 text-gray-500'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Queixa Principal</label>
            <textarea className="input-field" rows={2} value={form.chief_complaint} onChange={e => updateForm('chief_complaint', e.target.value)} />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Sinais Vitais</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-gray-500">PA Sistólica</label><input className="input-field" type="number" value={form.systolic_bp} onChange={e => updateForm('systolic_bp', e.target.value)} placeholder="120" /></div>
              <div><label className="text-xs text-gray-500">PA Diastólica</label><input className="input-field" type="number" value={form.diastolic_bp} onChange={e => updateForm('diastolic_bp', e.target.value)} placeholder="80" /></div>
              <div><label className="text-xs text-gray-500">FC (bpm)</label><input className="input-field" type="number" value={form.heart_rate} onChange={e => updateForm('heart_rate', e.target.value)} placeholder="72" /></div>
              <div><label className="text-xs text-gray-500">Temp. (°C)</label><input className="input-field" type="number" step="0.1" value={form.temperature} onChange={e => updateForm('temperature', e.target.value)} placeholder="36.5" /></div>
              <div><label className="text-xs text-gray-500">FR (irpm)</label><input className="input-field" type="number" value={form.respiratory_rate} onChange={e => updateForm('respiratory_rate', e.target.value)} placeholder="16" /></div>
              <div><label className="text-xs text-gray-500">SpO₂ (%)</label><input className="input-field" type="number" value={form.spo2} onChange={e => updateForm('spo2', e.target.value)} placeholder="98" /></div>
              <div><label className="text-xs text-gray-500">Peso (kg)</label><input className="input-field" type="number" step="0.1" value={form.weight} onChange={e => updateForm('weight', e.target.value)} placeholder="70" /></div>
              <div><label className="text-xs text-gray-500">Altura (m)</label><input className="input-field" type="number" step="0.01" value={form.height} onChange={e => updateForm('height', e.target.value)} placeholder="1.70" /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CID-10 <span className="badge-cid ml-1">CID-10</span></label>
              <input className="input-field" value={form.icd10_code} onChange={e => updateForm('icd10_code', e.target.value)} placeholder="Ex: J06.9" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição CID-10</label>
              <input className="input-field" value={form.icd10_description} onChange={e => updateForm('icd10_description', e.target.value)} placeholder="Ex: IVAS" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
            <textarea className="input-field" rows={2} value={form.diagnosis} onChange={e => updateForm('diagnosis', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conduta</label>
            <textarea className="input-field" rows={2} value={form.conduct} onChange={e => updateForm('conduct', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Registrar Atendimento</button>
        </div>
      </Modal>
    </div>
  )
}
