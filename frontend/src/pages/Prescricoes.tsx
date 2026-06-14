import { useEffect, useState } from 'react'
import { Plus, Eye, Trash2, Pill } from 'lucide-react'
import { api, type Prescription, type Patient, type Professional, type PrescriptionItem } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

export default function Prescricoes() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<Prescription | null>(null)
  const { addToast } = useToast()
  const [form, setForm] = useState({ patient_id: '', professional_id: '', notes: '', items: [{ medication_name: '', dosage: '', frequency: '', duration: '', route: 'Oral', instructions: '' }] as Omit<PrescriptionItem, 'id'>[] })

  useEffect(() => {
    Promise.all([
      api.getPrescriptions().then(setPrescriptions),
      api.getPatients('limit=100').then(r => setPatients(r.data)),
      api.getProfessionals('category=Médico').then(setProfessionals),
    ]).catch(() => addToast('error', 'Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [])

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { medication_name: '', dosage: '', frequency: '', duration: '', route: 'Oral', instructions: '' }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: string, value: string) => setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }))

  const handleCreate = async () => {
    try {
      await api.createPrescription({ patient_id: form.patient_id, professional_id: form.professional_id, notes: form.notes, items: form.items })
      addToast('success', 'Prescrição criada')
      setModalOpen(false)
      const res = await api.getPrescriptions()
      setPrescriptions(res)
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro') }
  }

  const openPreview = async (id: string) => {
    try {
      const data = await api.getPrescription(id)
      setPreviewData(data)
      setPreviewOpen(true)
    } catch { addToast('error', 'Erro ao carregar prescrição') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover prescrição?')) return
    try {
      await api.deletePrescription(id)
      addToast('success', 'Prescrição removida')
      const res = await api.getPrescriptions()
      setPrescriptions(res)
    } catch { addToast('error', 'Erro ao remover') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receitas e Prescrições</h1>
          <p className="text-gray-500 text-sm mt-1">{prescriptions.length} prescrições</p>
        </div>
        <button onClick={() => { setForm({ patient_id: '', professional_id: '', notes: '', items: [{ medication_name: '', dosage: '', frequency: '', duration: '', route: 'Oral', instructions: '' }] }); setModalOpen(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Prescrição
        </button>
      </div>

      <div className="space-y-3">
        {prescriptions.map(p => (
          <div key={p.id} className="card !p-4 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-vivas-green-light flex items-center justify-center">
              <Pill className="w-5 h-5 text-vivas-green" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium text-gray-900">{p.patient_name}</p>
              <p className="text-sm text-gray-500">Dr(a). {p.professional_name} • {p.items?.filter(i => i.id).length || 0} medicamento(s)</p>
            </div>
            <span className={`badge ${p.status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{p.status}</span>
            <span className="text-xs text-gray-400">{new Date(p.date_time).toLocaleDateString('pt-BR')}</span>
            <div className="flex gap-1">
              <button onClick={() => openPreview(p.id)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-vivas-blue"><Eye className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Prescrição" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
              <select className="input-field" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                <option value="">Selecione</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
              <select className="input-field" value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}>
                <option value="">Selecione</option>
                {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Medicamentos</h4>
              <button onClick={addItem} className="text-xs text-vivas-blue hover:underline">+ Adicionar medicamento</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-500">Medicamento {i + 1}</span>
                  {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:underline">Remover</button>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <input className="input-field" placeholder="Nome do medicamento" value={item.medication_name} onChange={e => updateItem(i, 'medication_name', e.target.value)} />
                  <input className="input-field" placeholder="Dose" value={item.dosage} onChange={e => updateItem(i, 'dosage', e.target.value)} />
                  <input className="input-field" placeholder="Frequência" value={item.frequency} onChange={e => updateItem(i, 'frequency', e.target.value)} />
                  <input className="input-field" placeholder="Duração" value={item.duration} onChange={e => updateItem(i, 'duration', e.target.value)} />
                  <select className="input-field" value={item.route} onChange={e => updateItem(i, 'route', e.target.value)}>
                    <option>Oral</option><option>Intravenoso</option><option>Intramuscular</option><option>Tópico</option><option>Sublingual</option>
                  </select>
                  <input className="input-field" placeholder="Instruções" value={item.instructions} onChange={e => updateItem(i, 'instructions', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
          <button onClick={handleCreate} className="btn-primary">Criar Prescrição</button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Receita Médica" size="lg">
        {previewData && (
          <div className="border-2 border-gray-200 rounded-xl p-8 bg-white">
            {/* Header */}
            <div className="text-center border-b-2 border-vivas-blue pb-4 mb-6">
              <h2 className="text-xl font-bold text-vivas-blue">VIVAS - Plataforma de Saúde</h2>
              <p className="text-sm text-gray-500">Receita Médica</p>
            </div>

            {/* Patient & Doctor */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <p className="font-semibold text-gray-900">Paciente</p>
                <p>{previewData.patient_name}</p>
                {previewData.patient_cpf && <p className="text-gray-500">CPF: {previewData.patient_cpf}</p>}
                {previewData.patient_cns && <p><span className="badge-sus text-xs">CNS: {previewData.patient_cns}</span></p>}
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">Prescritor</p>
                <p>{previewData.professional_name}</p>
                {previewData.professional_reg && <p className="text-gray-500">{previewData.professional_reg}</p>}
                <p className="text-gray-500">{previewData.specialty}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">Data: {new Date(previewData.date_time).toLocaleDateString('pt-BR')}</p>

            {/* Medications */}
            <div className="space-y-4 mb-8">
              {previewData.items?.filter(i => i.id).map((item, i) => (
                <div key={item.id} className="flex gap-3">
                  <span className="text-vivas-blue font-bold">{i + 1}.</span>
                  <div>
                    <p className="font-semibold">{item.medication_name}</p>
                    <p className="text-sm text-gray-600">{item.dosage} — {item.frequency} — {item.duration}</p>
                    <p className="text-sm text-gray-500">Via: {item.route}</p>
                    {item.instructions && <p className="text-sm text-gray-400 italic">{item.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div className="border-t pt-6 mt-8 text-center">
              <div className="w-48 mx-auto border-b border-gray-400 mb-2" />
              <p className="text-sm font-medium">{previewData.professional_name}</p>
              <p className="text-xs text-gray-500">{previewData.professional_reg}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
