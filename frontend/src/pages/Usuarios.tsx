import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Shield, UserCheck, UserX } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

interface UserRecord {
  id: string; email: string; full_name: string; role: string; avatar_color: string; active: boolean; created_at: string
}

const ROLES = [
  { value: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-700' },
  { value: 'medico', label: 'Médico', color: 'bg-blue-100 text-blue-700' },
  { value: 'enfermeiro', label: 'Enfermeiro', color: 'bg-green-100 text-green-700' },
  { value: 'psicologo', label: 'Psicólogo', color: 'bg-pink-100 text-pink-700' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta', color: 'bg-purple-100 text-purple-700' },
  { value: 'paciente', label: 'Paciente', color: 'bg-gray-100 text-gray-700' },
  { value: 'marketing_admin', label: 'Marketing', color: 'bg-amber-100 text-amber-700' },
]

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function Usuarios() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<UserRecord>>({})
  const [isEdit, setIsEdit] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const { token } = useAuth()
  const { addToast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/users`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      setUsers(await res.json())
    } catch { addToast('error', 'Erro ao carregar usuários') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing({ email: '', full_name: '', role: 'paciente', active: true })
    setNewPassword('')
    setIsEdit(false)
    setModalOpen(true)
  }
  const openEdit = (u: UserRecord) => { setEditing({ ...u }); setNewPassword(''); setIsEdit(true); setModalOpen(true) }

  const handleSave = async () => {
    try {
      if (isEdit && editing.id) {
        const res = await fetch(`${API_BASE}/auth/users/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ full_name: editing.full_name, role: editing.role, active: editing.active }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        addToast('success', 'Usuário atualizado')
      } else {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: editing.email, password: newPassword, full_name: editing.full_name, role: editing.role }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        addToast('success', 'Usuário criado')
      }
      setModalOpen(false); load()
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro') }
  }

  const toggleActive = async (u: UserRecord) => {
    try {
      await fetch(`${API_BASE}/auth/users/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !u.active }),
      })
      addToast('success', u.active ? 'Usuário desativado' : 'Usuário ativado')
      load()
    } catch { addToast('error', 'Erro ao atualizar') }
  }

  const filtered = users.filter(u =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const r = ROLES.find(r => r.value === role)
    return r ? <span className={`badge ${r.color}`}>{r.label}</span> : <span className="badge bg-gray-100 text-gray-700">{role}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} usuários cadastrados</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Role summary */}
      <div className="flex gap-2 flex-wrap">
        {ROLES.map(r => {
          const count = users.filter(u => u.role === r.value).length
          if (count === 0) return null
          return (
            <div key={r.value} className={`badge ${r.color} !px-3 !py-1.5`}>
              <Shield className="w-3 h-3 mr-1" /> {r.label}: {count}
            </div>
          )
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Buscar por nome ou email..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Usuário</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Perfil</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Cadastro</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: u.avatar_color || '#0057B8' }}>
                        {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{u.email}</td>
                  <td className="px-6 py-3">{getRoleBadge(u.role)}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600 text-xs">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-vivas-blue"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => toggleActive(u)} className={`p-2 rounded-lg ${u.active ? 'hover:bg-red-50 text-gray-400 hover:text-red-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}>
                        {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? 'Editar Usuário' : 'Novo Usuário'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input className="input-field" value={editing.full_name || ''} onChange={e => setEditing(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={editing.email || ''} onChange={e => setEditing(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select className="input-field" value={editing.role || 'paciente'} onChange={e => setEditing(p => ({ ...p, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={handleSave} className="btn-primary flex-1">{isEdit ? 'Salvar' : 'Criar Usuário'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
