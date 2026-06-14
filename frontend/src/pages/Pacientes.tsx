import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, type Patient } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

const EMPTY_PATIENT: Partial<Patient> = {
  full_name: '', cpf: '', cns: '', birth_date: '', gender: 'Masculino', phone: '', email: '',
  address_city: '', address_state: 'MG', blood_type: '', allergies: '', notes: '',
}

export default function Pacientes() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Patient>>(EMPTY_PATIENT)
  const [isEdit, setIsEdit] = useState(false)
  const { addToast } = useToast()
  const limit = 10

  const loadPatients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      const res = await api.getPatients(params.toString())
      setPatients(res.data)
      setTotal(res.total)
    } catch {
      addToast('error', 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }, [page, search, addToast])

  useEffect(() => { loadPatients() }, [loadPatients])

  const openNew = () => { setEditing({ ...EMPTY_PATIENT }); setIsEdit(false); setModalOpen(true) }
  const openEdit = (p: Patient) => { setEditing({ ...p, birth_date: p.birth_date?.split('T')[0] }); setIsEdit(true); setModalOpen(true) }

  const handleSave = async () => {
    try {
      if (isEdit && editing.id) {
        await api.updatePatient(editing.id, editing)
        addToast('success', 'Paciente atualizado com sucesso')
      } else {
        await api.createPatient(editing)
        addToast('success', 'Paciente cadastrado com sucesso')
      }
      setModalOpen(false)
      loadPatients()
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este paciente?')) return
    try {
      await api.deletePatient(id)
      addToast('success', 'Paciente removido')
      loadPatients()
    } catch {
      addToast('error', 'Erro ao remover paciente')
    }
  }

  const totalPages = Math.ceil(total / limit)

  const updateField = (field: string, value: string) => setEditing(prev => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 text-sm mt-1">{total} pacientes cadastrados</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Paciente
        </button>
      </div>

      {/* Search */}
      <div className="card !p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou CNS..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum paciente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">CPF</th>
                  <th className="px-6 py-3 font-medium">CNS</th>
                  <th className="px-6 py-3 font-medium">Nascimento</th>
                  <th className="px-6 py-3 font-medium">Cidade</th>
                  <th className="px-6 py-3 font-medium">Tipo Sang.</th>
                  <th className="px-6 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.full_name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{p.cpf}</td>
                    <td className="px-6 py-4">{p.cns ? <span className="badge-sus">CNS {p.cns}</span> : <span className="text-gray-400">—</span>}</td>
                    <td className="px-6 py-4 text-gray-600">{p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{p.address_city || '—'}</td>
                    <td className="px-6 py-4"><span className="badge bg-red-50 text-red-700">{p.blood_type || '—'}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-vivas-blue transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost !px-2 !py-1"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost !px-2 !py-1"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? 'Editar Paciente' : 'Novo Paciente'} size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
            <input className="input-field" value={editing.full_name || ''} onChange={e => updateField('full_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
            <input className="input-field" placeholder="000.000.000-00" value={editing.cpf || ''} onChange={e => updateField('cpf', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNS <span className="badge-sus ml-1">SUS</span></label>
            <input className="input-field" value={editing.cns || ''} onChange={e => updateField('cns', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento *</label>
            <input type="date" className="input-field" value={editing.birth_date || ''} onChange={e => updateField('birth_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo *</label>
            <select className="input-field" value={editing.gender || 'Masculino'} onChange={e => updateField('gender', e.target.value)}>
              <option>Masculino</option><option>Feminino</option><option>Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input className="input-field" value={editing.phone || ''} onChange={e => updateField('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input-field" value={editing.email || ''} onChange={e => updateField('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input className="input-field" value={editing.address_city || ''} onChange={e => updateField('address_city', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input className="input-field" maxLength={2} value={editing.address_state || ''} onChange={e => updateField('address_state', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Sanguíneo</label>
            <select className="input-field" value={editing.blood_type || ''} onChange={e => updateField('blood_type', e.target.value)}>
              <option value="">Selecione</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
            <input className="input-field" value={editing.allergies || ''} onChange={e => updateField('allergies', e.target.value)} placeholder="Ex: Penicilina, Dipirona" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={editing.notes || ''} onChange={e => updateField('notes', e.target.value)} />
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
