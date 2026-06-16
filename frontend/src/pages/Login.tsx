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
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center text-white p-12">
        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
          <Heart className="w-12 h-12" fill="white" />
        </div>
        <h1 className="font-display text-5xl font-extrabold mb-3">VivaS</h1>
        <p className="text-xl text-white/70 mb-8">Saúde preventiva inteligente</p>
        <div className="max-w-md text-center text-white/60 space-y-2">
          <p>Cuide da sua saúde com inteligência artificial como suporte preventivo</p>
          <p className="text-sm">Dashboard &middot; Exames &middot; Teleconsulta &middot; Triagem &middot; Saúde Preventiva</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 rounded-xl bg-wine flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-wine">VivaS</h1>
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

          <div className="mt-4 p-3 bg-wine-soft rounded-xl text-xs text-wine">
            <p className="font-bold mb-1">Contas de demonstração:</p>
            <p>Admin: admin@vivas.com / admin123</p>
            <p>Médico: bruno.hodos@gmail.com / medico123</p>
            <p>Psicóloga: psicologa@vivas.com / psicologo123</p>
            <p>Paciente: brunocorreafotografo@gmail.com / paciente123</p>
            <p>Marketing: marketing@vivas.com / marketing123</p>
            <p>RH Empresa: rh@techcorp.com.br / rh12345</p>
          </div>
        </div>
      </div>
    </div>
  )
}
