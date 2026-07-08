import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, UserCheck, Baby } from 'lucide-react'

interface FamilyMember {
  id: string
  name: string
  email: string | null
  date_of_birth: string | null
  gender: string | null
  titular_id: string | null
  is_titular: boolean
}

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function FamilyMembers() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', dateOfBirth: '', gender: '' })
  const [error, setError] = useState('')

  const token = localStorage.getItem('vivas_token')

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API_BASE}/subscriptions/family-members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API_BASE}/subscriptions/family-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao adicionar membro')
        return
      }
      setForm({ name: '', email: '', dateOfBirth: '', gender: '' })
      setShowAdd(false)
      fetchMembers()
    } catch (err) {
      setError('Erro de conexão')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remover este membro da família?')) return
    try {
      await fetch(`${API_BASE}/subscriptions/family-members/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchMembers()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-wine border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-ink">Minha Família</h1>
          <p className="text-muted text-sm mt-1">Gerencie os membros do seu plano familiar</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-wine text-white rounded-xl font-display font-bold text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar membro
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-card p-6 space-y-4 border border-wine-line">
          <h3 className="font-display font-bold text-ink">Novo membro da família</h3>
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Nome completo *</label>
              <input
                type="text" required value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Email</label>
              <input
                type="email" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Data de nascimento</label>
              <input
                type="date" value={form.dateOfBirth}
                onChange={e => setForm({...form, dateOfBirth: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1">Gênero</label>
              <select
                value={form.gender}
                onChange={e => setForm({...form, gender: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine"
              >
                <option value="">Selecionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-6 py-2.5 bg-wine text-white rounded-xl font-display font-bold text-sm">
              Adicionar
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2.5 bg-wine-soft text-wine rounded-xl font-display font-bold text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => (
          <div key={member.id} className={`bg-white rounded-2xl shadow-card p-5 border ${member.is_titular ? 'border-wine' : 'border-line'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${member.is_titular ? 'bg-wine text-white' : 'bg-wine-soft text-wine'}`}>
                {member.is_titular ? <UserCheck className="w-6 h-6" /> : <Baby className="w-6 h-6" />}
              </div>
              {!member.is_titular && (
                <button onClick={() => handleRemove(member.id)} className="text-muted hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <h3 className="font-display font-bold text-ink">{member.name}</h3>
            {member.email && <p className="text-sm text-muted mt-1">{member.email}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${member.is_titular ? 'bg-wine text-white' : 'bg-wine-soft text-wine'}`}>
                {member.is_titular ? 'Titular' : 'Dependente'}
              </span>
              {member.gender && <span className="text-xs text-muted">{member.gender}</span>}
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-wine-line mx-auto mb-3" />
            <p className="text-muted">Nenhum membro cadastrado ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}
