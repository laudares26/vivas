import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Building2, Users, UserPlus, Search, Trash2, Mail, Phone, Briefcase, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react'

interface Employee {
  id: string
  email: string
  full_name: string
  role: string
  active: boolean
  created_at: string
  department: string
  job_title: string
  company_role: string
}

interface Company {
  id: string
  name: string
  cnpj: string
  trade_name: string
  sector: string
  employee_count: number
  contact_email: string
  contact_phone: string
  status: string
}

export default function EmpresaDashboard() {
  const { token } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [newEmployee, setNewEmployee] = useState({ full_name: '', email: '', department: '', job_title: '' })

  const API = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    fetchCompany()
    fetchEmployees()
  }, [])

  async function fetchCompany() {
    try {
      const res = await fetch(`${API}/api/companies/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setCompany(await res.json())
      }
    } catch (err) {
      console.error('Error fetching company:', err)
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API}/api/companies/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setEmployees(await res.json())
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmployee.full_name || !newEmployee.email) return

    try {
      const res = await fetch(`${API}/api/companies/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEmployee)
      })
      const data = await res.json()
      if (res.ok) {
        showToast('Colaborador cadastrado com sucesso! Email de boas-vindas enviado.', 'success')
        setNewEmployee({ full_name: '', email: '', department: '', job_title: '' })
        setShowAddForm(false)
        fetchEmployees()
      } else {
        showToast(data.error || 'Erro ao cadastrar colaborador', 'error')
      }
    } catch {
      showToast('Erro ao cadastrar colaborador', 'error')
    }
  }

  async function handleRemoveEmployee(userId: string) {
    if (!confirm('Tem certeza que deseja remover este colaborador?')) return

    try {
      const res = await fetch(`${API}/api/companies/employees/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showToast('Colaborador removido', 'success')
        fetchEmployees()
      }
    } catch {
      showToast('Erro ao remover colaborador', 'error')
    }
  }

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  )

  const rhCount = employees.filter(e => e.company_role === 'rh').length
  const employeeCount = employees.filter(e => e.company_role === 'employee').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-wine border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-wine/10 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-wine" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">{company?.name || 'Minha Empresa'}</h1>
            <p className="text-muted text-sm">
              {company?.cnpj && `CNPJ: ${company.cnpj}`}
              {company?.sector && ` · ${company.sector}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-line shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wine-soft rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-wine" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{employeeCount}</p>
              <p className="text-xs text-muted">Colaboradores</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-line shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{rhCount}</p>
              <p className="text-xs text-muted">Gestores RH</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-line shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">vivas Empresas</p>
              <p className="text-xs text-muted">Plano ativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Management */}
      <div className="bg-white rounded-2xl border border-line shadow-sm">
        <div className="p-5 border-b border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <Users className="w-5 h-5 text-wine" />
            Colaboradores
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-line rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:border-wine"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-wine text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-wine-deep transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar
            </button>
          </div>
        </div>

        {/* Add employee form */}
        {showAddForm && (
          <form onSubmit={handleAddEmployee} className="p-5 border-b border-line bg-wine-soft/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Nome completo *</label>
                <input
                  type="text"
                  value={newEmployee.full_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-wine"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Email *</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-wine"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Departamento</label>
                <input
                  type="text"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-wine"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Cargo</label>
                <input
                  type="text"
                  value={newEmployee.job_title}
                  onChange={(e) => setNewEmployee({ ...newEmployee, job_title: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-wine"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-wine text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-wine-deep transition-colors">
                Cadastrar colaborador
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-2 rounded-xl text-sm border border-line hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
            <p className="text-xs text-muted mt-3">O colaborador receberá um email com instruções de acesso à plataforma VivaS.</p>
          </form>
        )}

        {/* Employee list */}
        <div className="divide-y divide-line">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum colaborador cadastrado</p>
              <p className="text-sm mt-1">Clique em "Cadastrar" para adicionar o primeiro colaborador.</p>
            </div>
          ) : (
            filtered.map(emp => (
              <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-wine/10 flex items-center justify-center text-wine font-semibold text-sm">
                    {emp.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-ink text-sm">{emp.full_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>
                      {emp.department && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{emp.department}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    emp.company_role === 'rh' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {emp.company_role === 'rh' ? 'RH' : 'Colaborador'}
                  </span>
                  {emp.job_title && <span className="text-xs text-muted hidden sm:inline">{emp.job_title}</span>}
                  {emp.company_role !== 'rh' && (
                    <button
                      onClick={() => handleRemoveEmployee(emp.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover colaborador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
