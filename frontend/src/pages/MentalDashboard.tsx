import { useState } from 'react'
import { Video, Plus, Calendar, Heart, MessageCircle, Moon, BookOpen, Activity } from 'lucide-react'

const moods = [
  { emoji: '😞', label: 'Muito difícil' },
  { emoji: '🙁', label: 'Difícil' },
  { emoji: '😐', label: 'Neutro' },
  { emoji: '🙂', label: 'Bem' },
  { emoji: '😄', label: 'Muito bem' },
]

export default function MentalDashboard() {
  const [selectedMood, setSelectedMood] = useState(2)

  return (
    <div className="min-h-screen" style={{ background: '#F3EFEC', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white border-b flex items-center justify-between px-5 md:px-7 h-[68px]" style={{ borderColor: '#ECE3DE' }}>
        <div className="flex flex-col">
          <span className="font-bold text-[26px] tracking-tight" style={{ fontFamily: "'Poppins', sans-serif", color: '#6E1E2E', letterSpacing: '-1.3px' }}>
            v<span className="relative inline-block">ı<span className="absolute left-1/2 -translate-x-1/2 top-[0.02em] w-[0.24em] h-[0.24em] rounded-full" style={{ background: '#C97B63' }}></span></span>vas
          </span>
          <small className="text-[8.5px] font-semibold uppercase tracking-[0.18em] mt-[3px] pl-[2px]" style={{ color: '#857470' }}>Saúde Mental</small>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-xs font-medium bg-white" style={{ borderColor: '#ECE3DE' }}>
            <Calendar className="w-3.5 h-3.5 opacity-50" /> Junho 2026
          </span>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #C97B63, #6E1E2E)' }}>B</div>
        </div>
      </header>

      <main className="max-w-[1380px] mx-auto px-5 md:px-7 py-6 pb-12">
        {/* Header */}
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9A2D43' }}>Meu espaço</div>
          <h1 className="text-[26px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#3F1019', letterSpacing: '-0.01em' }}>Olá, Bruno</h1>
          <p className="text-sm mt-1" style={{ color: '#857470' }}>Que bom ter você por aqui. Como você está se sentindo hoje?</p>
        </div>

        {/* Check-in + Próxima sessão */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: window.innerWidth > 768 ? '2fr 1fr' : '1fr' }}>
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#ECE3DE' }}>
            <div className="mb-4">
              <h3 className="font-bold text-[14.5px]">Check-in de humor</h3>
              <p className="text-xs mt-0.5" style={{ color: '#857470' }}>Leva 5 segundos e ajuda o seu psicólogo a te acompanhar.</p>
            </div>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              {moods.map((m, i) => (
                <button key={i} onClick={() => setSelectedMood(i)}
                  className={`flex-1 min-w-[72px] border rounded-xl py-3 px-2 text-center transition-all cursor-pointer ${selectedMood === i ? 'border-[#6E1E2E] bg-[#F6E7E1]' : 'border-[#ECE3DE] bg-white hover:border-[#C97B63]'}`}>
                  <div className="text-2xl leading-none">{m.emoji}</div>
                  <div className="text-[11.5px] font-semibold mt-2" style={{ color: '#857470' }}>{m.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(150deg, #9A2D43, #6E1E2E)' }}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-[14.5px]">Próxima sessão</h3>
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>Hoje</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold" style={{ background: 'rgba(255,255,255,0.2)', fontFamily: "'Fraunces', serif" }}>C</div>
              <div>
                <div className="font-bold text-base">Dra. Carla Sousa</div>
                <div className="text-sm opacity-80 mt-0.5">Psicóloga · TCC · Hoje, 18h30</div>
              </div>
            </div>
            <button className="mt-4 w-full bg-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: '#6E1E2E' }}>
              <Video className="w-4 h-4" /> Entrar na sala
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#ECE3DE' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: '#F6E7E1', color: '#6E1E2E' }}>
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#857470' }}>Sessões realizadas</div>
            <div className="text-3xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif", color: '#3F1019' }}>8</div>
            <div className="text-[11px] mt-1.5" style={{ color: '#A99B96' }}>desde março</div>
          </div>
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#ECE3DE' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: '#F6E7E1', color: '#6E1E2E' }}>
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#857470' }}>Sequência de check-ins</div>
            <div className="text-3xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif", color: '#3F1019' }}>5 <small className="text-sm font-semibold" style={{ color: '#A99B96' }}>dias</small></div>
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full mt-1" style={{ color: '#2FA56B', background: '#E4F4EC' }}>▲ continue assim</span>
          </div>
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#ECE3DE' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: '#F6E7E1', color: '#6E1E2E' }}>
              <Heart className="w-4 h-4" />
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#857470' }}>Meu bem-estar</div>
            <div className="text-3xl font-semibold mt-2" style={{ fontFamily: "'Fraunces', serif", color: '#3F1019' }}>68<small className="text-sm font-semibold" style={{ color: '#A99B96' }}>/100</small></div>
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full mt-1" style={{ color: '#2FA56B', background: '#E4F4EC' }}>▲ 7 no mês</span>
          </div>
        </div>

        {/* Chart + Exercises */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: window.innerWidth > 768 ? '2fr 1fr' : '1fr' }}>
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#ECE3DE' }}>
            <div className="mb-4">
              <h3 className="font-bold text-[14.5px]">Meu bem-estar nas últimas semanas</h3>
              <p className="text-xs mt-0.5" style={{ color: '#857470' }}>Construído a partir dos seus check-ins de humor.</p>
            </div>
            <svg viewBox="0 0 600 200" className="w-full">
              <defs><linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9A2D43" stopOpacity="0.2"/><stop offset="1" stopColor="#9A2D43" stopOpacity="0"/></linearGradient></defs>
              <g stroke="#EFE7E2"><line x1="30" y1="30" x2="590" y2="30"/><line x1="30" y1="90" x2="590" y2="90"/><line x1="30" y1="150" x2="590" y2="150"/></g>
              <path d="M70,138 L160,142 L250,118 L340,106 L430,90 L520,74 L520,170 L70,170 Z" fill="url(#a1)"/>
              <path d="M70,138 L160,142 L250,118 L340,106 L430,90 L520,74" fill="none" stroke="#9A2D43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <g fill="#fff" stroke="#9A2D43" strokeWidth="3"><circle cx="70" cy="138" r="4"/><circle cx="160" cy="142" r="4"/><circle cx="250" cy="118" r="4"/><circle cx="340" cy="106" r="4"/><circle cx="430" cy="90" r="4"/><circle cx="520" cy="74" r="5" fill="#9A2D43"/></g>
              <g fontFamily="Plus Jakarta Sans" fontSize="11" fill="#857470" textAnchor="middle"><text x="70" y="190">Sem 1</text><text x="160" y="190">Sem 2</text><text x="250" y="190">Sem 3</text><text x="340" y="190">Sem 4</text><text x="430" y="190">Sem 5</text><text x="520" y="190">Sem 6</text></g>
            </svg>
          </div>
          <div className="bg-white border rounded-2xl p-5" style={{ borderColor: '#ECE3DE' }}>
            <div className="mb-4">
              <h3 className="font-bold text-[14.5px]">Da sua psicóloga</h3>
              <p className="text-xs mt-0.5" style={{ color: '#857470' }}>Exercícios sugeridos para a semana.</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-3 border rounded-xl" style={{ borderColor: '#ECE3DE' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F6E7E1', color: '#6E1E2E' }}>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[13px]">Respiração 4-7-8</div>
                  <div className="text-[11.5px]" style={{ color: '#857470' }}>5 min · ansiedade</div>
                </div>
                <a href="#" className="text-xs font-bold" style={{ color: '#6E1E2E' }}>Iniciar</a>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-xl" style={{ borderColor: '#ECE3DE' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F6E7E1', color: '#6E1E2E' }}>
                  <Moon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[13px]">Higiene do sono</div>
                  <div className="text-[11.5px]" style={{ color: '#857470' }}>guia · 7 dias</div>
                </div>
                <a href="#" className="text-xs font-bold" style={{ color: '#6E1E2E' }}>Abrir</a>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-xl" style={{ borderColor: '#ECE3DE' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#F6E7E1', color: '#6E1E2E' }}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[13px]">Diário de gratidão</div>
                  <div className="text-[11.5px]" style={{ color: '#857470' }}>2 min por dia</div>
                </div>
                <a href="#" className="text-xs font-bold" style={{ color: '#6E1E2E' }}>Escrever</a>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button className="inline-flex items-center gap-2 text-white rounded-lg py-3 px-5 text-sm font-semibold" style={{ background: '#6E1E2E' }}>
            <Plus className="w-4 h-4" /> Agendar nova sessão
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg py-3 px-4 text-sm font-semibold border" style={{ color: '#6E1E2E', borderColor: '#E9C4BE', background: 'transparent' }}>
            Ver meu histórico
          </button>
        </div>
      </main>
    </div>
  )
}
