import { useState, useRef, useEffect } from 'react'
import { Bot, Send, AlertTriangle, Pill, Sparkles } from 'lucide-react'

interface ChatMessage {
  from: 'user' | 'ai'
  text: string
  type?: 'interaction_alert'
}

const DRUG_INTERACTIONS = [
  { drugs: ['warfarina', 'aspirina'], severity: 'alta', description: 'Risco aumentado de sangramento. Monitorar INR frequentemente.' },
  { drugs: ['metformina', 'contraste'], severity: 'alta', description: 'Risco de acidose lática. Suspender metformina 48h antes do procedimento.' },
  { drugs: ['captopril', 'espironolactona'], severity: 'media', description: 'Risco de hipercalemia. Monitorar potássio sérico.' },
  { drugs: ['omeprazol', 'clopidogrel'], severity: 'media', description: 'Omeprazol pode reduzir eficácia do clopidogrel. Considerar pantoprazol.' },
  { drugs: ['sinvastatina', 'amiodarona'], severity: 'alta', description: 'Risco de rabdomiólise. Limitar sinvastatina a 20mg/dia.' },
  { drugs: ['losartana', 'potassio'], severity: 'media', description: 'Risco de hipercalemia. Monitorar níveis de potássio.' },
]

export default function Assistente() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: 'ai', text: 'Olá! Sou o assistente médico IA do VIVAS. Posso ajudar com:\n\n• Informações sobre medicamentos\n• Verificação de interações medicamentosas\n• Suporte a decisões clínicas\n• Consultas sobre protocolos\n\nComo posso ajudá-lo?' },
  ])
  const [input, setInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const [drugCheck, setDrugCheck] = useState({ drug1: '', drug2: '' })
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg = input
    setMessages(prev => [...prev, { from: 'user', text: userMsg }])
    setInput('')
    setAiTyping(true)

    setTimeout(() => {
      const responses: { keywords: RegExp; response: string }[] = [
        { keywords: /amoxicilina|antibiótico/i, response: 'Amoxicilina é um antibiótico beta-lactâmico de amplo espectro.\n\n**Indicações:** Infecções do trato respiratório, urinário, otite média, sinusite.\n\n**Posologia adulto:** 500mg 8/8h por 7-10 dias.\n\n**Contraindicações:** Hipersensibilidade a penicilinas.\n\n**Efeitos adversos comuns:** Diarreia, náuseas, rash cutâneo.' },
        { keywords: /pressão|hipertensão|anti-hipertensivo/i, response: 'Para manejo da hipertensão arterial:\n\n**1ª linha:**\n• IECA (Captopril, Enalapril)\n• BRA (Losartana, Valsartana)\n• Tiazídico (HCTZ)\n• BCC (Anlodipino)\n\n**Meta pressórica:** <140/90 mmHg (geral) ou <130/80 mmHg (diabetes, DRC).\n\n**Monitoramento:** Função renal, eletrólitos, PA regular.' },
        { keywords: /diabetes|glicemia|insulina/i, response: 'Protocolo para Diabetes Mellitus tipo 2:\n\n**1ª linha:** Metformina 500-2000mg/dia\n**2ª linha:** Adicionar Glicazida ou Sitagliptina\n**3ª linha:** Insulina basal\n\n**Metas:**\n• HbA1c < 7%\n• Glicemia jejum: 80-130 mg/dL\n• Glicemia pós-prandial: < 180 mg/dL\n\nMonitorar função renal e hepática.' },
        { keywords: /interação|interações/i, response: 'Para verificar interações medicamentosas, utilize o painel ao lado "Verificador de Interações". Digite os dois medicamentos que deseja verificar e clique em "Verificar".\n\nEu também posso ajudar se você me informar os medicamentos diretamente.' },
      ]

      const match = responses.find(r => r.keywords.test(userMsg))
      const response = match?.response || 'Baseado na sua consulta, recomendo revisar os protocolos clínicos atualizados e, se necessário, encaminhar para avaliação especializada. Posso fornecer mais detalhes sobre um tópico específico. O que gostaria de saber?'

      setMessages(prev => [...prev, { from: 'ai', text: response }])
      setAiTyping(false)
    }, 1800)
  }

  const checkInteraction = () => {
    const d1 = drugCheck.drug1.toLowerCase()
    const d2 = drugCheck.drug2.toLowerCase()
    if (!d1 || !d2) return

    const found = DRUG_INTERACTIONS.find(i =>
      (i.drugs.some(d => d1.includes(d)) && i.drugs.some(d => d2.includes(d)))
    )

    if (found) {
      setMessages(prev => [...prev, {
        from: 'ai',
        text: `**Interação detectada entre ${drugCheck.drug1} e ${drugCheck.drug2}:**\n\nSeveridade: ${found.severity.toUpperCase()}\n\n${found.description}`,
        type: 'interaction_alert',
      }])
    } else {
      setMessages(prev => [...prev, {
        from: 'ai',
        text: `Nenhuma interação significativa encontrada entre ${drugCheck.drug1} e ${drugCheck.drug2} na base de dados. Consulte fontes adicionais para confirmação.`,
      }])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assistente Médico IA</h1>
        <p className="text-gray-500 text-sm mt-1">Suporte clínico inteligente e verificação de interações</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 card flex flex-col h-[600px]">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vivas-blue to-vivas-green flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Assistente Clínico VIVAS</h3>
              <div className="flex items-center gap-1 text-xs text-green-500">
                <Sparkles className="w-3 h-3" /> IA Ativa
              </div>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  msg.from === 'user'
                    ? 'bg-vivas-blue text-white rounded-br-none'
                    : msg.type === 'interaction_alert'
                    ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.type === 'interaction_alert' && (
                    <div className="flex items-center gap-1 text-red-600 font-semibold mb-2">
                      <AlertTriangle className="w-4 h-4" /> Alerta de Interação
                    </div>
                  )}
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>
              </div>
            ))}
            {aiTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-3 rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
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
              placeholder="Pergunte sobre medicamentos, protocolos, diagnósticos..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="btn-primary !px-3" disabled={aiTyping}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drug Interaction Checker */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-vivas-green" />
              Verificador de Interações
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Medicamento 1</label>
                <input className="input-field" placeholder="Ex: Warfarina" value={drugCheck.drug1} onChange={e => setDrugCheck(d => ({ ...d, drug1: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Medicamento 2</label>
                <input className="input-field" placeholder="Ex: Aspirina" value={drugCheck.drug2} onChange={e => setDrugCheck(d => ({ ...d, drug2: e.target.value }))} />
              </div>
              <button onClick={checkInteraction} className="btn-primary w-full">Verificar Interação</button>
            </div>
          </div>

          <div className="card">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Interações Conhecidas</h4>
            <div className="space-y-2 text-xs">
              {DRUG_INTERACTIONS.slice(0, 4).map((inter, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inter.severity === 'alta' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="text-gray-700">{inter.drugs.join(' + ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
