import { useState, useEffect, useRef } from 'react'
import { Video, VideoOff, Mic, MicOff, Phone, MonitorUp, MessageSquare, Clock, User } from 'lucide-react'

export default function Teleconsulta() {
  const [inCall, setInCall] = useState(false)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([
    { from: 'Sistema', text: 'Teleconsulta iniciada. Aguardando conexão...' },
  ])
  const [newMsg, setNewMsg] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inCall) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [inCall])

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const startCall = () => {
    setInCall(true)
    setSeconds(0)
    setMessages(prev => [...prev, { from: 'Sistema', text: 'Videochamada conectada com sucesso.' }])
  }

  const endCall = () => {
    setInCall(false)
    clearInterval(timerRef.current)
    setMessages(prev => [...prev, { from: 'Sistema', text: `Teleconsulta encerrada. Duração: ${formatTime(seconds)}` }])
  }

  const sendMessage = () => {
    if (!newMsg.trim()) return
    setMessages(prev => [...prev, { from: 'Dr(a). Médico', text: newMsg }])
    setNewMsg('')
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'Paciente', text: 'Mensagem recebida, obrigado(a)!' }])
    }, 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teleconsulta</h1>
        <p className="text-gray-500 text-sm mt-1">Atendimento por videochamada</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main video */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
            {inCall ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-white text-lg font-medium">Paciente Conectado</p>
                    <p className="text-gray-400 text-sm">Maria Silva Santos</p>
                  </div>
                </div>
                {/* Timer */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white font-mono text-sm">{formatTime(seconds)}</span>
                </div>
                {/* Self view */}
                <div className="absolute bottom-4 right-4 w-36 h-24 bg-gray-800 rounded-lg border-2 border-white/20 flex items-center justify-center">
                  {videoOff ? (
                    <VideoOff className="w-6 h-6 text-gray-500" />
                  ) : (
                    <div className="text-center">
                      <User className="w-8 h-8 text-gray-500 mx-auto" />
                      <p className="text-gray-400 text-[10px]">Você</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-300 text-lg mb-2">Pronto para teleconsulta</p>
                  <p className="text-gray-500 text-sm mb-6">Clique em iniciar para começar a videochamada</p>
                  <button onClick={startCall} className="btn-success text-lg px-8 py-3">
                    Iniciar Teleconsulta
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          {inCall && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setMuted(!muted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button onClick={() => setVideoOff(!videoOff)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${videoOff ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <button className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center">
                <MonitorUp className="w-5 h-5" />
              </button>
              <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-lg">
                <Phone className="w-6 h-6 rotate-[135deg]" />
              </button>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="card flex flex-col h-[500px]">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <MessageSquare className="w-5 h-5 text-vivas-blue" />
            <h3 className="font-semibold text-gray-900">Chat</h3>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.from === 'Sistema' ? 'text-center' : msg.from.startsWith('Dr') ? 'text-right' : ''}`}>
                {msg.from === 'Sistema' ? (
                  <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{msg.text}</span>
                ) : (
                  <div className={`inline-block max-w-[80%] ${msg.from.startsWith('Dr') ? 'bg-vivas-blue text-white' : 'bg-gray-100 text-gray-800'} rounded-xl px-3 py-2`}>
                    <p className="text-[10px] font-medium opacity-70 mb-0.5">{msg.from}</p>
                    <p>{msg.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <input
              className="input-field flex-1"
              placeholder="Digite uma mensagem..."
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="btn-primary !px-3">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
