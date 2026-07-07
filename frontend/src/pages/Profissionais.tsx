import { useEffect, useState } from 'react'
import { Search, Plus, Edit2, Trash2, Star, CalendarDays } from 'lucide-react'
import { api, type Professional } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

const TABS = [
  { key: '', label: 'Todos' },
  { key: 'Médico', label: 'Médicos' },
  { key: 'Enfermeiro', label: 'Enfermeiros' },
  { key: 'Psicólogo', label: 'Psicólogos' },
  { key: 'Fisioterapeuta', label: 'Fisioterapeutas' },
]

const EMPTY: Partial<Professional> = {
  full_name: '', cpf: '', professional_id: '', category: 'Médico', specialty: '', cnes: '', phone: '', email: '',
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const CAT_COLORS: Record<string, string> = {
  'Médico': 'bg-blue-100 text-blue-700',
  'Enfermeiro': 'bg-green-100 text-green-700',
  'Psicólogo': 'bg-pink-100 text-pink-700',
  'Fisioterapeuta': 'bg-purple-100 text-purple-700',
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
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500 uppercase text-xs">
                <th className="px-6 py-3 font-medium">Profissional</th>
                <th className="px-6 py-3 font-medium">Registro</th>
                <th className="px-6 py-3 font-medium">Especialidade</th>
                <th className="px-6 py-3 font-medium">CNES</th>
                <th className="px-6 py-3 font-medium">Agenda</th>
                <th className="px-6 py-3 font-medium">Consultas/Mês</th>
                <th className="px-6 py-3 font-medium">Avaliação</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-vivas-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {getInitials(p.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.full_name}</p>
                        <span className={`badge text-[10px] ${CAT_COLORS[p.category] || 'bg-gray-100 text-gray-700'}`}>{p.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{p.professional_id}</td>
                  <td className="px-6 py-3 text-gray-600">{p.specialty}</td>
                  <td className="px-6 py-3">{p.cnes ? <span className="badge-cnes text-xs">CNES {p.cnes}</span> : '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1 text-gray-600 text-xs">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                      {p.schedule || 'Seg-Sex'}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600 font-medium">{p.consultations_month || 0}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium text-gray-900">{Number(p.rating || 0).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-wine-soft text-gray-400 hover:text-vivas-blue"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <option>Médico</option><option>Enfermeiro</option><option>Psicólogo</option><option>Fisioterapeuta</option>
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
