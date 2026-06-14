import { useEffect, useState } from 'react'
import { Search, Plus, Edit2, Trash2 } from 'lucide-react'
import { api, type Professional } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

const TABS = [
  { key: '', label: 'Todos' },
  { key: 'Médico', label: 'Médicos' },
  { key: 'Enfermeiro', label: 'Enfermeiros' },
  { key: 'Fisioterapeuta', label: 'Fisioterapeutas' },
]

const EMPTY: Partial<Professional> = {
  full_name: '', cpf: '', professional_id: '', category: 'Médico', specialty: '', cnes: '', phone: '', email: '',
}

export default function Profissionais() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Professional>>(EMPTY)
  const [isEdit, setIsEdit] = useState(false)
  const { addToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tab) params.set('category', tab)
      if (search) params.set('search', search)
      const res = await api.getProfessionals(params.toString())
      setProfessionals(res)
    } catch { addToast('error', 'Erro ao carregar profissionais') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab, search])

  const openNew = () => { setEditing({ ...EMPTY }); setIsEdit(false); setModalOpen(true) }
  const openEdit = (p: Professional) => { setEditing({ ...p }); setIsEdit(true); setModalOpen(true) }

  const handleSave = async () => {
    try {
      if (isEdit && editing.id) {
        await api.updateProfessional(editing.id, editing)
        addToast('success', 'Profissional atualizado')
      } else {
        await api.createProfessional(editing)
        addToast('success', 'Profissional cadastrado')
      }
      setModalOpen(false); load()
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro ao salvar') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover profissional?')) return
    try { await api.deleteProfessional(id); addToast('success', 'Removido'); load() }
    catch { addToast('error', 'Erro ao remover') }
  }

  const updateField = (field: string, value: string) => setEditing(prev => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-gray-500 text-sm mt-1">{professionals.length} profissionais</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Profissional
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow-sm text-vivas-blue' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Buscar profissional..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.full_name}</h3>
                  <p className="text-sm text-gray-500">{p.specialty}</p>
                </div>
                <span className={`badge ${p.category === 'Médico' ? 'bg-blue-100 text-blue-700' : p.category === 'Enfermeiro' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                  {p.category}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p className="font-mono text-xs">{p.professional_id}</p>
                {p.cnes && <span className="badge-cnes">CNES {p.cnes}</span>}
                <p>{p.phone}</p>
              </div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(p)} className="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1"><Edit2 className="w-3 h-3" />Editar</button>
                <button onClick={() => handleDelete(p.id)} className="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1 text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" />Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? 'Editar Profissional' : 'Novo Profissional'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <input className="input-field" value={editing.full_name || ''} onChange={e => updateField('full_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
              <input className="input-field" value={editing.cpf || ''} onChange={e => updateField('cpf', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registro Prof.</label>
              <input className="input-field" placeholder="CRM-MG 12345" value={editing.professional_id || ''} onChange={e => updateField('professional_id', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select className="input-field" value={editing.category || 'Médico'} onChange={e => updateField('category', e.target.value)}>
                <option>Médico</option><option>Enfermeiro</option><option>Fisioterapeuta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
              <input className="input-field" value={editing.specialty || ''} onChange={e => updateField('specialty', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNES <span className="badge-cnes ml-1">CNES</span></label>
            <input className="input-field" value={editing.cnes || ''} onChange={e => updateField('cnes', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input className="input-field" value={editing.phone || ''} onChange={e => updateField('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input-field" value={editing.email || ''} onChange={e => updateField('email', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">Salvar</button>
        </div>
      </Modal>
    </div>
  )
}
