import { useEffect, useState } from 'react'
import { Plus, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { api, type Appointment, type Patient, type Professional } from '../services/api'
import { useToast } from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'

const STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-wine-soft text-wine',
  confirmado: 'bg-green-100 text-green-700',
  em_atendimento: 'bg-amber-100 text-amber-700',
  concluido: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function Agendamentos() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ patient_id: '', professional_id: '', date_time: '', type: 'Consulta', notes: '', invite_new_patient: false, patient_name: '', patient_email: '' })
  const { addToast } = useToast()
  const { user } = useAuth()
  const isPatient = user?.role === 'paciente'

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.getAppointments(`date=${selectedDate}`)
      setAppointments(res)
    } catch { addToast('error', 'Erro ao carregar agendamentos') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [selectedDate])

  useEffect(() => {
    api.getProfessionals().then(setProfessionals).catch(() => {})
    if (!isPatient) {
      api.getPatients('limit=100').then(r => setPatients(r.data)).catch(() => {})
    }
  }, [isPatient])

  const handleCreate = async () => {
    try {
      await api.createAppointment(form)
      addToast('success', form.invite_new_patient ? 'Convite enviado ao paciente' : 'Agendamento criado')
      setModalOpen(false); load()
    } catch (err) { addToast('error', err instanceof Error ? err.message : 'Erro') }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const apt = appointments.find(a => a.id === id)
      if (!apt) return
      await api.updateAppointment(id, { ...apt, status })
      addToast('success', 'Status atualizado')
      load()
    } catch { addToast('error', 'Erro ao atualizar status') }
  }

  // Mini calendar
  const year = calendarMonth.getFullYear()
  const month = calendarMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const prevMonth = () => setCalendarMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCalendarMonth(new Date(year, month + 1, 1))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isPatient ? 'Minha Agenda' : 'Agendamentos'}</h1>
          <p className="text-gray-500 text-sm mt-1">{appointments.length} agendamentos para {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
        </div>
        <button onClick={() => { setForm({ patient_id: '', professional_id: '', date_time: `${selectedDate}T08:00`, type: 'Consulta', notes: '', invite_new_patient: false, patient_name: '', patient_email: '' }); setModalOpen(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mini Calendar */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold capitalize">
              {calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="font-medium text-gray-400 py-1">{d}</div>)}
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`w-8 h-8 rounded-full text-xs mx-auto flex items-center justify-center transition-all ${
                    isSelected ? 'bg-wine text-white' : isToday ? 'bg-wine-soft text-wine font-semibold' : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-40"><div className="animate-spin w-8 h-8 border-4 border-wine border-t-transparent rounded-full" /></div>
          ) : appointments.length === 0 ? (
            <div className="card text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum agendamento para esta data</p>
            </div>
          ) : (
            appointments.map(apt => (
              <div key={apt.id} className="card !p-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-wine">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold text-sm">{new Date(apt.date_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {isPatient ? apt.professional_name : apt.patient_name}
                    {apt.is_first_free && <span className="badge bg-wine-soft text-wine">1ª grátis</span>}
                  </p>
                  <p className="text-sm text-gray-500">{isPatient ? (apt.specialty || apt.type) : `${apt.professional_name} • ${apt.specialty || apt.type}`}</p>
                </div>
                <span className={`badge ${STATUS_COLORS[apt.status] || 'bg-gray-100 text-gray-700'}`}>{apt.status}</span>
                {!isPatient && (
                  <select
                    value={apt.status}
                    onChange={e => handleStatusChange(apt.id, e.target.value)}
                    className="input-field !w-auto !py-1 text-xs"
                  >
                    <option value="agendado">Agendado</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Agendamento">
        <div className="space-y-4">
          {!isPatient && (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-700 bg-wine-soft/60 rounded-lg px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={form.invite_new_patient} onChange={e => setForm(f => ({ ...f, invite_new_patient: e.target.checked }))} />
                Convidar paciente ainda não cadastrado (1ª consulta gratuita)
              </label>
              {form.invite_new_patient ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do paciente</label>
                    <input type="text" className="input-field" placeholder="Nome completo" value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do paciente *</label>
                    <input type="email" className="input-field" placeholder="email@exemplo.com" value={form.patient_email} onChange={e => setForm(f => ({ ...f, patient_email: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                  <select className="input-field" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                    <option value="">Selecione</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profissional *</label>
            <select className="input-field" value={form.professional_id} onChange={e => setForm(f => ({ ...f, professional_id: e.target.value }))}>
              <option value="">Selecione</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.full_name} - {p.specialty}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora *</label>
            <input type="datetime-local" className="input-field" value={form.date_time} onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option>Consulta</option><option>Retorno</option><option>Exame</option><option>Procedimento</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setModalOpen(false)} className="btn-ghost">Cancelar</button>
          <button onClick={handleCreate} className="btn-primary">Agendar</button>
        </div>
      </Modal>
    </div>
  )
}
