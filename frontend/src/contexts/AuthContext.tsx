import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  avatar_color: string
}

interface Relationships {
  patients: { id: string; full_name: string; email: string }[]
  professionals: { id: string; full_name: string; email: string; role: string }[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  relationships: Relationships
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, full_name: string, sessionId?: string, plan?: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('vivas_token'))
  const [relationships, setRelationships] = useState<Relationships>({ patients: [], professionals: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          const { relationships: rel, ...userData } = data
          setUser(userData)
          if (rel) setRelationships(rel)
        })
        .catch(() => { setToken(null); localStorage.removeItem('vivas_token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao fazer login')
    }
    const data = await res.json()
    localStorage.setItem('vivas_token', data.token)
    setToken(data.token)
    setUser(data.user)
    if (data.relationships) setRelationships(data.relationships)
  }

  const register = async (email: string, password: string, full_name: string, sessionId?: string, plan?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name, sessionId, plan }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Erro ao registrar')
    }
    const data = await res.json()
    localStorage.setItem('vivas_token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('vivas_token')
    setToken(null)
    setUser(null)
    setRelationships({ patients: [], professionals: [] })
  }

  return (
    <AuthContext.Provider value={{ user, token, relationships, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
