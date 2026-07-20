import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Home, Calendar, FileText, User, MessageCircle } from 'lucide-react'
import { api } from '../services/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ViviChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Ola! Sou a Vivi, sua assistente de saude inteligente. Posso te ajudar com duvidas sobre exames, consultas, medicamentos, saude mental e muito mais. Como posso ajudar voce hoje?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (text: string) => {
    const content = text.trim()
    if (!content) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    const history = messages
      .filter(m => m.id !== '1')
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const { reply } = await api.viviChat(content, history)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema para responder agora. Se for urgente, procure atendimento imediato (SAMU 192) ou, em crise emocional, ligue para o CVV no 188. Tente novamente em instantes.',
        timestamp: new Date()
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = () => {
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Header */}
      <header className="bg-gradient-to-r from-wine to-wine-deep text-white px-4 py-4 flex items-center gap-3 safe-top">
        <button onClick={() => navigate('/')} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="font-display font-bold text-sm">Vivi</p>
          <p className="text-[10px] text-white/70">Assistente de saude vivas</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-wine text-white rounded-br-md'
                : 'bg-white shadow-sm border border-line rounded-bl-md'
            }`}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-muted'}`}>
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border border-line rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-wine/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-wine/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-wine/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {['Meus exames', 'Agendar consulta', 'Saude mental', 'Meu plano', 'Dicas de alimentacao'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => sendMessage(suggestion)}
              className="text-xs bg-wine-soft text-wine px-3 py-1.5 rounded-full font-medium"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-line px-4 py-3">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-gray-50 border border-line rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-wine"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 bg-wine text-white rounded-full flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-line flex justify-around py-3 z-50" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {[
          { icon: Home, label: 'Inicio', path: '/' },
          { icon: Calendar, label: 'Agenda', path: '/agendamentos' },
          { icon: MessageCircle, label: 'Vivi', path: '/vivi' },
          { icon: FileText, label: 'Saude', path: '/saude-preventiva' },
          { icon: User, label: 'Perfil', path: '/configuracoes' },
        ].map((item, i) => (
          <button key={i} onClick={() => navigate(item.path)} className={`flex flex-col items-center gap-1 text-xs font-semibold ${item.path === '/vivi' ? 'text-wine' : 'text-muted'}`}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
