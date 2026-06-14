import { useState } from 'react'
import { Heart, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'



export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, fullName)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0057B8 0%, #003D82 50%, #002D61 100%)' }}>
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center text-white p-12">
        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
          <Heart className="w-12 h-12" />
        </div>
        <h1 className="text-5xl font-bold mb-3">VIVAS Saúde</h1>
        <p className="text-xl text-blue-200 mb-8">Sistema Integrado SUS</p>
        <div className="max-w-md text-center text-blue-200/80 space-y-2">
          <p>Plataforma completa de gestão em saúde com inteligência artificial</p>
          <p className="text-sm">Dashboard • Pacientes • Agendamentos • Triagem IA • Prontuário Eletrônico</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 rounded-xl bg-vivas-blue flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-vivas-blue">VIVAS Saúde</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {isRegister ? 'Criar conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isRegister ? 'Preencha os dados para se cadastrar' : 'Faça login para acessar o sistema'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="input-field" placeholder="Seu nome completo" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="seu@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> :
                isRegister ? <><UserPlus className="w-4 h-4" /> Cadastrar</> : <><LogIn className="w-4 h-4" /> Entrar</>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <button onClick={() => { setIsRegister(!isRegister); setError('') }}
              className="text-vivas-blue font-medium hover:underline">
              {isRegister ? 'Fazer login' : 'Cadastre-se'}
            </button>
          </div>

          {!isRegister && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p className="font-medium mb-1">Contas de demonstração:</p>
              <p>Admin: admin@vivas.com / admin123</p>
              <p>Médico: ricardo@vivas.com / medico123</p>
              <p>Enfermeiro: mariana@vivas.com / enfermeiro123</p>
              <p>Marketing: marketing@vivas.com / marketing123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
