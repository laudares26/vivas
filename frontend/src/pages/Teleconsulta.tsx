import { useState, useEffect, useRef } from 'react'
import { Video, VideoOff, Mic, MicOff, Phone, MonitorUp, MessageSquare, Clock, User, CalendarDays, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface TimeSlot {
  hour: string
  available: boolean
  patientAvailable?: boolean
  professionalAvailable?: boolean
}

interface Professional {
  id: number
  name: string
  specialty: string
  avatar_color: string
}

interface ScheduledConsult {
  id: number
  professional: string
  patient: string
  date: string
  hour: string
  status: 'agendada' | 'em_andamento' | 'concluida'
}

const MY_PROFESSIONALS: Professional[] = [
  { id: 1, name: 'Dr. Ricardo Oliveira', specialty: 'Cardiologista', avatar_color: '#0057B8' },
  { id: 2, name: 'Dra. Ana Psicóloga', specialty: 'Psicóloga', avatar_color: '#7C3AED' },
  { id: 3, name: 'Dr. Carlos Fisio', specialty: 'Fisioterapeuta', avatar_color: '#16A34A' },
  { id: 4, name: 'Enf. Mariana Costa', specialty: 'Enfermeira', avatar_color: '#EA580C' },
]

const SCHEDULED_CONSULTS: ScheduledConsult[] = [
  { id: 1, professional: 'Dr. Ricardo Oliveira', patient: 'Maria Silva', date: '2026-06-16', hour: '09:00', status: 'agendada' },
  { id: 2, professional: 'Dra. Ana Psicóloga', patient: 'Maria Silva', date: '2026-06-17', hour: '14:00', status: 'agendada' },
  { id: 3, professional: 'Dr. Carlos Fisio', patient: 'Maria Silva', date: '2026-06-18', hour: '10:00', status: 'agendada' },
]

function generateSlots(): TimeSlot[] {
  const hours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']
  return hours.map(h => {
    const profAvail = Math.random() > 0.3
    const patAvail = Math.random() > 0.4
    return { hour: h, available: profAvail && patAvail, professionalAvailable: profAvail, patientAvailable: patAvail }
  })
}

export default function Teleconsulta() {
  const { user } = useAuth()
  const isPaciente = user?.role === 'paciente'
  const isProfessional = ['medico', 'psicologo'].includes(user?.role || '')

  const [view, setView] = useState<'schedule' | 'call'>('schedule')
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [consults] = useState<ScheduledConsult[]>(SCHEDULED_CONSULTS)

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
    if (inCall) { timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000) }
    return () => clearInterval(timerRef.current)
  }, [inCall])

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight) }, [messages])

  useEffect(() => {
    if (isPaciente ? selectedProfessional && selectedDate : selectedDate) { setSlots(generateSlots()); setSelectedSlot(null) }
  }, [selectedProfessional, selectedDate, isPaciente])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const startCall = () => { setInCall(true); setSeconds(0); setMessages(prev => [...prev, { from: 'Sistema', text: 'Videochamada conectada com sucesso.' }]) }
  const endCall = () => { setInCall(false); clearInterval(timerRef.current); setMessages(prev => [...prev, { from: 'Sistema', text: `Teleconsulta encerrada. Duração: ${formatTime(seconds)}` }]) }

  const sendMessage = () => {
    if (!newMsg.trim()) return
    setMessages(prev => [...prev, { from: isPaciente ? 'Paciente' : 'Dr(a). Profissional', text: newMsg }])
    setNewMsg('')
    setTimeout(() => { setMessages(prev => [...prev, { from: isPaciente ? 'Dr(a). Profissional' : 'Paciente', text: 'Mensagem recebida, obrigado(a)!' }]) }, 1500)
  }

  const getWeekDates = () => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return d.toISOString().split('T')[0] })
  }
  const weekDates = getWeekDates()
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (view === 'call') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Teleconsulta</h1>
            <p className="text-gray-500 text-sm mt-1">Atendimento por videochamada</p>
          </div>
          <button onClick={() => setView('schedule')} className="text-sm text-vivas-blue hover:underline">← Voltar ao agendamento</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
              {inCall ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4"><User className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" /></div>
                      <p className="text-white text-base sm:text-lg font-medium">{isPaciente ? 'Profissional Conectado' : 'Paciente Conectado'}</p>
                      <p className="text-gray-400 text-sm">{isPaciente ? 'Dr. Ricardo Oliveira' : 'Maria Silva Santos'}</p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><Clock className="w-3 h-3 sm:w-4 sm:h-4 text-white" /><span className="text-white font-mono text-xs sm:text-sm">{formatTime(seconds)}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-24 h-16 sm:w-36 sm:h-24 bg-gray-800 rounded-lg border-2 border-white/20 flex items-center justify-center">
                    {videoOff ? <VideoOff className="w-5 h-5 text-gray-500" /> : <div className="text-center"><User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 mx-auto" /><p className="text-gray-400 text-[9px] sm:text-[10px]">Você</p></div>}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <div className="text-center">
                    <Video className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-300 text-base sm:text-lg mb-2">Pronto para teleconsulta</p>
                    <p className="text-gray-500 text-sm mb-6">Clique para iniciar a videochamada</p>
                    <button onClick={startCall} className="btn-success text-sm sm:text-lg px-6 sm:px-8 py-3">Iniciar Teleconsulta</button>
                  </div>
                </div>
              )}
            </div>
            {inCall && (
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <button onClick={() => setMuted(!muted)} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{muted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}</button>
                <button onClick={() => setVideoOff(!videoOff)} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${videoOff ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{videoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}</button>
                <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center"><MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                <button onClick={endCall} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center shadow-lg"><Phone className="w-5 h-5 sm:w-6 sm:h-6 rotate-[135deg]" /></button>
              </div>
            )}
          </div>
          <div className="card flex flex-col h-[350px] lg:h-[500px]">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100"><MessageSquare className="w-5 h-5 text-vivas-blue" /><h3 className="font-semibold text-gray-900 text-sm">Chat</h3></div>
            <div ref={chatRef} className="flex-1 overflow-y-auto py-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.from === 'Sistema' ? 'text-center' : ''}`}>
                  {msg.from === 'Sistema' ? <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{msg.text}</span> : (
                    <div className={`inline-block max-w-[85%] ${(msg.from === 'Paciente' && isPaciente) || (msg.from.startsWith('Dr') && isProfessional) ? 'bg-vivas-blue text-white' : 'bg-gray-100 text-gray-800'} rounded-xl px-3 py-2`}>
                      <p className="text-[10px] font-medium opacity-70 mb-0.5">{msg.from}</p><p className="text-sm">{msg.text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <input className="input-field flex-1 text-sm" placeholder="Mensagem..." value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
              <button onClick={sendMessage} className="btn-primary !px-3 text-sm">Enviar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Teleconsulta</h1>
        <p className="text-gray-500 text-sm mt-1">Agendamento e atendimento online com calendário sincronizado</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isPaciente && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><User className="w-5 h-5 text-vivas-blue" />Seus Profissionais de Saúde</h3>
              <p className="text-xs text-gray-500 mb-3">Selecione o profissional para verificar horários disponíveis em comum</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MY_PROFESSIONALS.map(prof => (
                  <button key={prof.id} onClick={() => setSelectedProfessional(prof)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedProfessional?.id === prof.id ? 'border-vivas-blue bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: prof.avatar_color }}>{prof.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                    <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{prof.name}</p><p className="text-xs text-gray-500">{prof.specialty}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-vivas-blue" />Selecionar Data</h3>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDates.map(date => {
                const d = new Date(date + 'T12:00:00')
                return (
                  <button key={date} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center p-1.5 sm:p-3 rounded-xl border transition-all ${selectedDate === date ? 'border-vivas-blue bg-blue-50 text-vivas-blue' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <span className="text-[9px] sm:text-xs text-gray-500 font-medium">{dayNames[d.getDay()]}</span>
                    <span className="text-sm sm:text-lg font-bold">{d.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {selectedDate && (isPaciente ? selectedProfessional : true) && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-5 h-5 text-vivas-blue" />Horários Disponíveis {isPaciente && selectedProfessional ? `- ${selectedProfessional.name}` : ''}</h3>
              <p className="text-xs text-gray-500 mb-3">{isPaciente ? 'Horários em que ambos (você e o profissional) estão disponíveis' : 'Seus horários disponíveis para teleconsulta'}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button key={slot.hour} onClick={() => slot.available && setSelectedSlot(slot.hour)} disabled={!slot.available}
                    className={`p-2 sm:p-3 rounded-xl border text-center transition-all ${selectedSlot === slot.hour ? 'border-vivas-green bg-green-50 text-vivas-green-dark' : slot.available ? 'border-gray-200 hover:border-vivas-blue hover:bg-blue-50' : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'}`}>
                    <p className="font-bold text-sm">{slot.hour}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {slot.available ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-300" />}
                      <span className="text-[10px]">{slot.available ? 'Disponível' : 'Indisponível'}</span>
                    </div>
                    {isPaciente && !slot.available && (
                      <div className="mt-1 text-[9px] text-gray-400">
                        {!slot.professionalAvailable && 'Prof. ocupado'}
                        {!slot.patientAvailable && slot.professionalAvailable && 'Seu horário ocupado'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedSlot && (
                <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-green-800">Horário: <strong>{selectedSlot}</strong> em {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    {isPaciente && selectedProfessional && <p className="text-xs text-green-600">Com {selectedProfessional.name}</p>}
                  </div>
                  <button onClick={() => setView('call')} className="btn-success text-sm whitespace-nowrap">Confirmar e Entrar</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Próximas Consultas</h3>
            <div className="space-y-2">
              {consults.map(c => (
                <div key={c.id} className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{isPaciente ? c.professional : c.patient}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{c.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CalendarDays className="w-3 h-3" /><span>{new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    <Clock className="w-3 h-3 ml-1" /><span>{c.hour}</span>
                  </div>
                  <button onClick={() => setView('call')} className="mt-2 w-full text-xs font-medium text-vivas-blue hover:bg-blue-50 p-1.5 rounded-lg transition-colors">Entrar na Teleconsulta</button>
                </div>
              ))}
            </div>
          </div>
          <div className="card bg-blue-50 border border-blue-100">
            <h4 className="font-medium text-sm text-gray-800 mb-2">Sincronização de Calendário</h4>
            <p className="text-xs text-gray-600">O sistema verifica automaticamente a disponibilidade de ambas as partes (profissional e paciente) para encontrar horários em comum para a teleconsulta.</p>
            <div className="mt-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-xs text-green-700 font-medium">Calendários sincronizados</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
