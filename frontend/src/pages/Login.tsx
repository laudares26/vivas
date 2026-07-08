import { useState } from 'react'
import { Heart, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #7B1E3C 0%, #5E1730 50%, #3A1020 100%)' }}>
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center text-white p-12">
        {/* Floating photo circles (institutional style) */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <div className="absolute top-16 left-14 w-28 h-28 rounded-full overflow-hidden border-[3px] border-white/20 opacity-60">
            <img src="/images/hero-family.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-20 left-24 w-20 h-20 rounded-full overflow-hidden border-[3px] border-white/15 opacity-45">
            <img src="/images/feature-telemedicine.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute top-28 right-16 w-24 h-24 rounded-full overflow-hidden border-[3px] border-white/15 opacity-50">
            <img src="/images/feature-mental.jpg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute bottom-16 right-24 w-16 h-16 rounded-full overflow-hidden border-[3px] border-white/15 opacity-40">
            <img src="/images/hero-doctor.jpg" alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
            <Heart className="w-12 h-12" fill="white" />
          </div>
          <h1 className="font-display text-5xl font-extrabold mb-3">vivas</h1>
          <p className="text-xl text-white/70 mb-8">Saúde preventiva inteligente</p>
          <div className="max-w-md text-center text-white/60 space-y-2">
            <p>Cuide da sua saúde com suporte preventivo inteligente</p>
            <p className="text-sm">Dashboard &middot; Exames &middot; Teleconsulta &middot; Triagem &middot; Saúde Preventiva</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 rounded-xl bg-wine flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-wine">vivas</h1>
          </div>

          <h2 className="text-2xl font-display font-extrabold text-ink mb-1">Bem-vindo de volta</h2>
          <p className="text-muted text-sm mb-6">Faça login para acessar sua conta</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine transition" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Senha</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-line bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-wine/30 focus:border-wine transition pr-12" placeholder="Sua senha" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-wine to-wine-deep text-white rounded-xl font-display font-bold text-sm disabled:opacity-50 transition hover:shadow-lg flex items-center justify-center gap-2">
              {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> :
                <><LogIn className="w-4 h-4" /> Entrar</>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted">
            Não tem conta?{' '}
            <a href="https://vivasaudeinteligente.com.br/#planos" className="text-wine font-semibold hover:underline">
              Assine um plano
            </a>
          </div>


        </div>
      </div>
    </div>
  )
}
