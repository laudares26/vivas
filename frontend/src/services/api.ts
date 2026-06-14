const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro de rede' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard'),

  // Patients
  getPatients: (params?: string) => request<PatientsResponse>(`/patients${params ? `?${params}` : ''}`),
  getPatient: (id: string) => request<Patient>(`/patients/${id}`),
  createPatient: (data: Partial<Patient>) => request<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id: string, data: Partial<Patient>) => request<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id: string) => request<void>(`/patients/${id}`, { method: 'DELETE' }),

  // Professionals
  getProfessionals: (params?: string) => request<Professional[]>(`/professionals${params ? `?${params}` : ''}`),
  createProfessional: (data: Partial<Professional>) => request<Professional>('/professionals', { method: 'POST', body: JSON.stringify(data) }),
  updateProfessional: (id: string, data: Partial<Professional>) => request<Professional>(`/professionals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProfessional: (id: string) => request<void>(`/professionals/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments: (params?: string) => request<Appointment[]>(`/appointments${params ? `?${params}` : ''}`),
  createAppointment: (data: Partial<Appointment>) => request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: Partial<Appointment>) => request<Appointment>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id: string) => request<void>(`/appointments/${id}`, { method: 'DELETE' }),

  // Medical Records
  getMedicalRecords: (params?: string) => request<MedicalRecord[]>(`/medical-records${params ? `?${params}` : ''}`),
  getMedicalRecord: (id: string) => request<MedicalRecord>(`/medical-records/${id}`),
  createMedicalRecord: (data: Partial<MedicalRecord>) => request<MedicalRecord>('/medical-records', { method: 'POST', body: JSON.stringify(data) }),

  // Prescriptions
  getPrescriptions: (params?: string) => request<Prescription[]>(`/prescriptions${params ? `?${params}` : ''}`),
  getPrescription: (id: string) => request<Prescription>(`/prescriptions/${id}`),
  createPrescription: (data: CreatePrescriptionData) => request<Prescription>('/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
  deletePrescription: (id: string) => request<void>(`/prescriptions/${id}`, { method: 'DELETE' }),

  // Exams
  getExams: (params?: string) => request<Exam[]>(`/exams${params ? `?${params}` : ''}`),
  createExam: (data: Partial<Exam>) => request<Exam>('/exams', { method: 'POST', body: JSON.stringify(data) }),
  updateExam: (id: string, data: Partial<Exam>) => request<Exam>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // EHR
  getEHR: (patientId: string) => request<EHREntry[]>(`/ehr/${patientId}`),
  createEHREntry: (data: Partial<EHREntry>) => request<EHREntry>('/ehr', { method: 'POST', body: JSON.stringify(data) }),

  // Triage
  getTriageQueue: (params?: string) => request<TriageRecord[]>(`/triage${params ? `?${params}` : ''}`),
  createTriage: (data: Partial<TriageRecord>) => request<TriageRecord>('/triage', { method: 'POST', body: JSON.stringify(data) }),
  updateTriage: (id: string, data: Partial<TriageRecord>) => request<TriageRecord>(`/triage/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Risk Predictions
  getRiskPredictions: (patientId: string) => request<RiskPrediction[]>(`/risk/${patientId}`),
  createRiskPrediction: (data: Partial<RiskPrediction>) => request<RiskPrediction>('/risk', { method: 'POST', body: JSON.stringify(data) }),
};

// Types
export interface Patient {
  id: string; full_name: string; cpf: string; cns: string; birth_date: string; gender: string;
  phone: string; email: string; address_street: string; address_number: string; address_complement: string;
  address_neighborhood: string; address_city: string; address_state: string; address_zip: string;
  blood_type: string; allergies: string; notes: string; active: boolean; created_at: string; updated_at: string;
}

export interface PatientsResponse { data: Patient[]; total: number; page: number; limit: number; }

export interface Professional {
  id: string; full_name: string; cpf: string; professional_id: string; category: string;
  specialty: string; cnes: string; phone: string; email: string; active: boolean;
  created_at: string; updated_at: string;
}

export interface Appointment {
  id: string; patient_id: string; professional_id: string; date_time: string; duration_minutes: number;
  type: string; status: string; notes: string; patient_name: string; professional_name: string;
  specialty: string; created_at: string;
}

export interface MedicalRecord {
  id: string; patient_id: string; professional_id: string; appointment_id: string; date_time: string;
  chief_complaint: string; manchester_priority: string; systolic_bp: number; diastolic_bp: number;
  heart_rate: number; temperature: number; respiratory_rate: number; spo2: number; weight: number;
  height: number; icd10_code: string; icd10_description: string; diagnosis: string; conduct: string;
  notes: string; patient_name: string; professional_name: string; created_at: string;
}

export interface PrescriptionItem {
  id: string; medication_name: string; dosage: string; frequency: string; duration: string;
  route: string; instructions: string;
}

export interface Prescription {
  id: string; patient_id: string; professional_id: string; medical_record_id: string;
  date_time: string; status: string; notes: string; items: PrescriptionItem[];
  patient_name: string; professional_name: string; patient_cpf?: string; patient_cns?: string;
  professional_reg?: string; specialty?: string; created_at: string;
}

export interface CreatePrescriptionData {
  patient_id: string; professional_id: string; medical_record_id?: string; notes?: string;
  items: Omit<PrescriptionItem, 'id'>[];
}

export interface Exam {
  id: string; patient_id: string; professional_id: string; medical_record_id: string;
  loinc_code: string; exam_name: string; category: string; status: string; result: string;
  result_date: string; ai_analysis: string; notes: string; patient_name: string;
  professional_name: string; created_at: string; updated_at: string;
}

export interface EHREntry {
  id: string; patient_id: string; entry_type: string; title: string; description: string;
  metadata: Record<string, string>; created_at: string;
}

export interface TriageRecord {
  id: string; patient_id: string; manchester_color: string; symptoms: string; ai_assessment: string;
  priority_score: number; wait_time_minutes: number; status: string; patient_name: string;
  birth_date: string; gender: string; created_at: string; updated_at: string;
}

export interface RiskPrediction {
  id: string; patient_id: string; cardiovascular_risk: number; diabetes_risk: number;
  hypertension_risk: number; renal_risk: number; recommendations: string; prediction_date: string;
}

export interface DashboardData {
  kpis: { totalPatients: number; totalProfessionals: number; appointmentsToday: number; triageQueue: number; };
  upcomingAppointments: Appointment[];
  specialtyStats: { specialty: string; count: number; }[];
  manchesterStats: { manchester_color: string; count: number; }[];
}
