import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Home, Calendar, FileText, User, MessageCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const VIVI_RESPONSES: Record<string, string> = {
  default: 'Entendi sua pergunta! Como assistente de saude preventiva, posso te ajudar com informacoes sobre seus exames, agendamentos, saude mental e dicas de bem-estar. Como posso te ajudar mais?',
  exame: 'Sobre seus exames: voce pode enviar fotos ou PDFs de resultados diretamente pelo app. Nossa IA analisa automaticamente os indicadores e, se algo estiver fora do normal, notificamos voce e seu medico. Quer enviar um exame agora?',
  consulta: 'Para agendar uma consulta, voce pode usar a teleconsulta (disponivel 24h) ou agendar presencialmente. Seu plano inclui teleconsultas ilimitadas! Posso te direcionar para o agendamento?',
  medicamento: 'Sobre medicamentos: sempre siga a prescricao do seu medico. Se tiver duvidas sobre interacoes ou efeitos colaterais, recomendo consultar na teleconsulta. Posso ajudar com algo mais?',
  plano: 'Seu plano VivaS inclui: teleconsultas ilimitadas, analise de exames por IA, alertas preventivos 24h, acesso a psicologos e saude mental. Sua carteirinha digital esta disponivel no app!',
  mental: 'Cuidar da saude mental e essencial! Nosso plano inclui acesso a psicologos online. Voce pode fazer check-ins diarios de humor e agendar sessoes. O sigilo e garantido. Quer saber mais?',
  pressao: 'A pressao arterial ideal e abaixo de 120/80 mmHg. Valores entre 120-139/80-89 requerem atencao. Acima de 140/90 e considerado hipertensao. Monitore regularmente e envie os resultados pelo app!',
  glicemia: 'A glicemia de jejum normal e entre 70-99 mg/dL. Entre 100-125 indica pre-diabetes. Acima de 126 pode indicar diabetes. Faca exames regulares e envie os resultados para acompanhamento.',
  colesterol: 'O colesterol LDL ideal e abaixo de 100 mg/dL. Ate 129 e aceitavel, 130-159 requer atencao, e acima de 160 e considerado alto. Exercicios e alimentacao saudavel ajudam a controlar!',
  dor: 'Para qualquer dor persistente, recomendo uma teleconsulta com nosso medico. Se for uma emergencia (dor no peito, dificuldade respiratoria), procure o pronto-socorro imediatamente.',
  sono: 'O sono e fundamental para a saude! Adultos devem dormir 7-9 horas por noite. Dicas: evite telas 1h antes de dormir, mantenha horarios regulares, e evite cafeina apos 14h.',
  alimentacao: 'Uma alimentacao equilibrada inclui: frutas e vegetais variados, proteinas magras, graos integrais e boa hidratacao (2L de agua/dia). Evite ultra-processados e excesso de acucar.',
  exercicio: 'A OMS recomenda 150 min/semana de atividade moderada ou 75 min de atividade intensa. Caminhada, natacao e yoga sao otimas opcoes. Comece devagar e aumente gradualmente!',
}

function getViviResponse(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('exame') || lower.includes('resultado') || lower.includes('laborat')) return VIVI_RESPONSES.exame
  if (lower.includes('consult') || lower.includes('agend') || lower.includes('medic') || lower.includes('doutor')) return VIVI_RESPONSES.consulta
  if (lower.includes('remedi') || lower.includes('medicament') || lower.includes('comprimido')) return VIVI_RESPONSES.medicamento
  if (lower.includes('plano') || lower.includes('carteirinha') || lower.includes('cobertura')) return VIVI_RESPONSES.plano
  if (lower.includes('mental') || lower.includes('ansied') || lower.includes('depress') || lower.includes('psicol')) return VIVI_RESPONSES.mental
  if (lower.includes('press') || lower.includes('hipertens')) return VIVI_RESPONSES.pressao
  if (lower.includes('glicemia') || lower.includes('glicose') || lower.includes('diabetes') || lower.includes('acucar')) return VIVI_RESPONSES.glicemia
  if (lower.includes('colesterol') || lower.includes('triglice') || lower.includes('ldl')) return VIVI_RESPONSES.colesterol
  if (lower.includes('dor') || lower.includes('doi') || lower.includes('machuc')) return VIVI_RESPONSES.dor
  if (lower.includes('sono') || lower.includes('dormir') || lower.includes('insonia')) return VIVI_RESPONSES.sono
  if (lower.includes('aliment') || lower.includes('dieta') || lower.includes('comer') || lower.includes('nutri')) return VIVI_RESPONSES.alimentacao
  if (lower.includes('exerc') || lower.includes('atividade') || lower.includes('academia') || lower.includes('caminh')) return VIVI_RESPONSES.exercicio
  return VIVI_RESPONSES.default
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

  const handleSend = () => {
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      const response = getViviResponse(userMsg.content)
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
      setIsTyping(false)
    }, 1000 + Math.random() * 1500)
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
          <p className="text-[10px] text-white/70">Assistente de saude VivaS</p>
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
              onClick={() => {
                const userMsg: Message = { id: Date.now().toString(), role: 'user', content: suggestion, timestamp: new Date() }
                setMessages(prev => [...prev, userMsg])
                setIsTyping(true)
                setTimeout(() => {
                  const response = getViviResponse(suggestion)
                  setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: response, timestamp: new Date() }])
                  setIsTyping(false)
                }, 1000 + Math.random() * 1500)
              }}
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
