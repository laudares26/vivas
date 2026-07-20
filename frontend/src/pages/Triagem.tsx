import { useEffect, useState, useRef } from 'react'
import { Brain, Send, Clock, User, AlertCircle } from 'lucide-react'
import { api, type TriageRecord, type Patient } from '../services/api'
import { useToast } from '../components/Toast'

const MANCHESTER = [
  { color: 'vermelho', label: 'Emergência', bg: 'bg-red-600', text: 'text-white', ring: 'ring-red-600', time: '0 min' },
  { color: 'laranja', label: 'Muito Urgente', bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-500', time: '10 min' },
  { color: 'amarelo', label: 'Urgente', bg: 'bg-yellow-400', text: 'text-gray-900', ring: 'ring-yellow-400', time: '60 min' },
  { color: 'verde', label: 'Pouco Urgente', bg: 'bg-green-500', text: 'text-white', ring: 'ring-green-500', time: '120 min' },
  { color: 'azul', label: 'Não Urgente', bg: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-500', time: '240 min' },
]

interface ChatMessage {
  from: 'user' | 'ai'
  text: string
}

export default function Triagem() {
  const [queue, setQueue] = useState<TriageRecord[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { from: 'ai', text: 'Olá! Sou o assistente de triagem inteligente. Descreva os sintomas do paciente para classificação pelo Protocolo de Manchester.' },
  ])
  const [input, setInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()

  useEffect(() => {
    Promise.all([
      api.getTriageQueue().then(setQueue),
      api.getPatients('limit=100').then(r => setPatients(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [chatMessages])

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg = input
    setChatMessages(prev => [...prev, { from: 'user', text: userMsg }])
    setInput('')
    setAiTyping(true)

    setTimeout(() => {
      const responses = [
        { symptoms: /dor.*peito|torác|precordial/i, color: 'vermelho', response: 'Sintomas indicam possível emergência cardiovascular. Classificação: VERMELHO (Emergência). Atendimento imediato necessário.' },
        { symptoms: /febre.*alt|39|40|convuls/i, color: 'laranja', response: 'Febre alta detectada. Classificação: LARANJA (Muito Urgente). Tempo máximo de espera: 10 minutos.' },
        { symptoms: /dor.*cabeça|cefaleia|enxaqueca/i, color: 'amarelo', response: 'Cefaleia reportada. Classificação: AMARELO (Urgente). Tempo máximo de espera: 60 minutos. Avaliar sinais de alerta.' },
        { symptoms: /tosse|gripe|resfriado|coriza/i, color: 'verde', response: 'Sintomas de infecção respiratória leve. Classificação: VERDE (Pouco Urgente). Tempo máximo de espera: 120 minutos.' },
        { symptoms: /receita|atestado|rotina/i, color: 'azul', response: 'Demanda não urgente. Classificação: AZUL (Não Urgente). Pode aguardar atendimento regular.' },
      ]

      const match = responses.find(r => r.symptoms.test(userMsg))
      const response = match
        ? match.response
        : 'Baseado nos sintomas descritos, recomendo avaliação presencial para classificação adequada. Classificação provisória: AMARELO (Urgente). Por favor, forneça mais detalhes sobre os sintomas.'

      setChatMessages(prev => [...prev, { from: 'ai', text: response }])
      setAiTyping(false)
    }, 1500)
  }

  const getManchester = (color: string) => MANCHESTER.find(m => m.color === color) || MANCHESTER[4]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Triagem Inteligente</h1>
        <p className="text-gray-500 text-sm mt-1">Classificação de risco inteligente, Protocolo de Manchester</p>
      </div>

      {/* Manchester legend */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {MANCHESTER.map(m => (
          <div key={m.color} className={`${m.bg} ${m.text} rounded-xl p-2 sm:p-3 text-center flex flex-col items-center justify-center min-w-0`}>
            <p className="text-[10px] sm:text-sm font-bold leading-tight break-words hyphens-auto">{m.label}</p>
            <p className="text-[10px] sm:text-xs opacity-80 mt-0.5 sm:mt-1">{m.time}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Chat */}
        <div className="card flex flex-col h-[500px]">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Assistente de Triagem</h3>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.from === 'user'
                    ? 'bg-vivas-blue text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {aiTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-3 rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <input
              className="input-field flex-1"
              placeholder="Descreva os sintomas..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="btn-primary !px-3" disabled={aiTyping}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Fila de Atendimento em Tempo Real
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-vivas-blue border-t-transparent rounded-full" /></div>
          ) : queue.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Fila de triagem vazia</p>
          ) : (
            <div className="space-y-2">
              {queue.map((record, idx) => {
                const m = getManchester(record.manchester_color)
                return (
                  <div key={record.id} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 bg-gray-50 hover:bg-gray-100 transition-colors`} style={{ borderColor: m.color === 'vermelho' ? '#DC2626' : m.color === 'laranja' ? '#EA580C' : m.color === 'amarelo' ? '#EAB308' : m.color === 'verde' ? '#16A34A' : '#2563EB' }}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{record.patient_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`badge ${m.bg} ${m.text} text-[10px]`}>{m.label}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />{record.wait_time_minutes} min
                        </span>
                      </div>
                    </div>
                    <span className={`badge ${record.status === 'em_atendimento' ? 'bg-amber-100 text-amber-700' : record.status === 'atendido' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {record.status === 'em_atendimento' ? 'Atendendo' : record.status === 'atendido' ? 'Atendido' : 'Aguardando'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
