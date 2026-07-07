import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, Copy, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { api, type Coupon } from '../services/api'
import { useToast } from '../components/Toast'
import Modal from '../components/Modal'

const EMPTY: Partial<Coupon> = { code: '', campaign: '', discount: '', max_redemptions: 0, valid_until: '', status: 'Ativo' }

export default function Cupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<Coupon>>(EMPTY)
  const [isEdit, setIsEdit] = useState(false)
  const { addToast } = useToast()

  const load = async () => {
    setLoading(true)
    try { setCoupons(await api.getCoupons()) }
    catch { addToast('error', 'Erro ao carregar cupons') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing({ ...EMPTY }); setIsEdit(false); setModalOpen(true) }
  const openEdit = (c: Coupon) => { setEditing({ ...c, valid_until: c.valid_until?.split('T')[0] }); setIsEdit(true); setModalOpen(true) }

  const handleSave = async () => {
    try {
      if (isEdit && editing.id) {
        await api.updateCoupon(editing.id, editing)
        addToast('success', 'Cupom atualizado')
      } else {
        await api.createCoupon(editing)
        addToast('success', 'Cupom criado')
      }
      setModalOpen(false); load()
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover cupom?')) return
    try { await api.deleteCoupon(id); addToast('success', 'Cupom removido'); load() }
    catch { addToast('error', 'Erro ao remover') }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    addToast('success', `Código ${code} copiado!`)
  }

  const filtered = coupons.filter(c =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) || c.campaign?.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = coupons.filter(c => c.status === 'Ativo').length
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptions || 0), 0)

  const updateField = (field: string, value: string | number) => setEditing(prev => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons e Promoções</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie campanhas e cupons de desconto</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <Tag className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
            <p className="text-sm text-gray-500">Cupons Ativos</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-wine-soft flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-wine" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalRedemptions.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Resgates</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{coupons.filter(c => c.status === 'Quase esgotado').length}</p>
            <p className="text-sm text-gray-500">Quase Esgotados</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="Buscar cupom ou campanha..." className="input-field pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Campanha</th>
                <th className="px-6 py-3 font-medium">Desconto</th>
                <th className="px-6 py-3 font-medium">Resgates</th>
                <th className="px-6 py-3 font-medium">Validade</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-vivas-blue">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="text-gray-400 hover:text-gray-600"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{c.campaign || '—'}</td>
                  <td className="px-6 py-3 font-medium text-gray-900">{c.discount}</td>
                  <td className="px-6 py-3 text-gray-600">{c.redemptions?.toLocaleString() || 0}{c.max_redemptions ? ` / ${c.max_redemptions.toLocaleString()}` : ''}</td>
                  <td className="px-6 py-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString('pt-BR') : 'Sem prazo'}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`badge ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : c.status === 'Quase esgotado' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-wine-soft text-gray-400 hover:text-vivas-blue"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEdit ? 'Editar Cupom' : 'Novo Cupom'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input className="input-field font-mono uppercase" value={editing.code || ''} onChange={e => updateField('code', e.target.value.toUpperCase())} placeholder="VIVAS30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desconto</label>
              <input className="input-field" value={editing.discount || ''} onChange={e => updateField('discount', e.target.value)} placeholder="30% ou Exame Grátis" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campanha</label>
            <input className="input-field" value={editing.campaign || ''} onChange={e => updateField('campaign', e.target.value)} placeholder="Nome da campanha" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Resgates</label>
              <input type="number" className="input-field" value={editing.max_redemptions || ''} onChange={e => updateField('max_redemptions', parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label>
              <input type="date" className="input-field" value={editing.valid_until || ''} onChange={e => updateField('valid_until', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="input-field" value={editing.status || 'Ativo'} onChange={e => updateField('status', e.target.value)}>
              <option value="Ativo">Ativo</option>
              <option value="Quase esgotado">Quase esgotado</option>
              <option value="Expirado">Expirado</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={handleSave} className="btn-primary flex-1">{isEdit ? 'Salvar' : 'Criar Cupom'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
