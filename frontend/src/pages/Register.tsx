import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Heart, Eye, EyeOff, Users, UserCheck } from 'lucide-react'

export default function Register() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const plan = searchParams.get('plan') || 'individual'
  
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    
    setLoading(true)
    try {
      await register(form.email, form.password, form.full_name, sessionId || undefined, plan)
      navigate('/')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao cadastrar'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const planNames: Record<string, string> = { individual: 'Individual', familia: 'Família', empresa: 'Empresa' }
  const planIcons: Record<string, typeof UserCheck> = { individual: UserCheck, familia: Users, empresa: Users }
  const PlanIcon = planIcons[plan] || UserCheck

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-wine flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </span>
            <span className="font-display font-extrabold text-2xl text-ink">vivas</span>
          </div>
          <h1 className="font-display font-extrabold text-xl text-ink">Crie sua conta</h1>
          <div className="mt-3 inline-flex items-center gap-2 bg-wine-soft text-wine text-sm font-semibold px-4 py-2 rounded-full">
            <PlanIcon className="w-4 h-4" />
            Plano {planNames[plan] || 'Individual'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Nome completo</label>
            <input
              type="text" required
              value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine transition"
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine transition pr-12"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Confirmar senha</label>
            <input
              type="password" required
              value={form.confirmPassword}
              onChange={e => setForm({...form, confirmPassword: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine transition"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-wine to-wine-deep text-white rounded-xl font-display font-bold text-sm disabled:opacity-50 transition hover:shadow-lg"
          >
            {loading ? 'Criando conta...' : 'Criar minha conta'}
          </button>

          <p className="text-center text-sm text-muted">
            Já tem conta? <a href="/login" className="text-wine font-semibold">Entrar</a>
          </p>
        </form>
      </div>
    </div>
  )
}
