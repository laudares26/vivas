const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('vivas_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options?.headers },
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
  uploadExam: async (file: File, examName?: string, examText?: string): Promise<ExamUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (examName) formData.append('exam_name', examName);
    if (examText) formData.append('exam_text', examText);
    const res = await fetch(`${API_BASE}/exams/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro de rede' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

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

  // Coupons
  getCoupons: () => request<Coupon[]>('/coupons'),
  createCoupon: (data: Partial<Coupon>) => request<Coupon>('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (id: string, data: Partial<Coupon>) => request<Coupon>(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoupon: (id: string) => request<void>(`/coupons/${id}`, { method: 'DELETE' }),

  // DICOM (Isis DICOM Viewer)
  getDicomStudies: (search?: string) => request<DicomStudy[]>(`/dicom/studies${search ? `?search=${search}` : ''}`),
  getDicomStudy: (id: string) => request<DicomStudyDetail>(`/dicom/studies/${id}`),
  deleteDicomStudy: (id: string) => request<void>(`/dicom/studies/${id}`, { method: 'DELETE' }),
  getDicomSeriesInstances: (seriesId: string) => request<DicomInstance[]>(`/dicom/series/${seriesId}/instances`),
  uploadDicomFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch(`${API_BASE}/dicom/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Erro' })); throw new Error(err.error); }
    return res.json();
  },
  getDicomFileUrl: (instanceId: string) => `${API_BASE}/dicom/file/${instanceId}`,
  // Vivi (LLM assistant)
  viviChat: (message: string, history: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    request<{ reply: string; source: string }>('/vivi/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  getPacsSources: () => request<PacsSource[]>('/dicom/pacs/sources'),
  createPacsSource: (data: Partial<PacsSource>) => request<PacsSource>('/dicom/pacs/sources', { method: 'POST', body: JSON.stringify(data) }),
  deletePacsSource: (id: string) => request<void>(`/dicom/pacs/sources/${id}`, { method: 'DELETE' }),
};

// Types
export interface Patient {
  id: string; full_name: string; cpf: string; cns: string; birth_date: string; gender: string;
  phone: string; email: string; address_street: string; address_number: string; address_complement: string;
  address_neighborhood: string; address_city: string; address_state: string; address_zip: string;
  blood_type: string; allergies: string; notes: string; convenio: string; status: string;
  active: boolean; created_at: string; updated_at: string;
}

export interface PatientsResponse { data: Patient[]; total: number; page: number; limit: number; }

export interface Professional {
  id: string; full_name: string; cpf: string; professional_id: string; category: string;
  specialty: string; cnes: string; phone: string; email: string; schedule: string;
  consultations_month: number; rating: number; active: boolean;
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

export interface ExamUploadResult {
  success: boolean;
  exam: Exam;
  indicators_found: number;
  indicators: Array<{ name: string; value: number }>;
  ai_analysis: string;
  notifications: { notified: boolean; alerts?: Array<{ label: string; value: number; unit: string; status: string }>; } | null;
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

export interface HealthAlert {
  id: string; patient_user_id: string; indicator_name: string; value: number;
  threshold: number; severity: string; created_at: string; read_by_patient: boolean;
  read_by_professional: boolean; patient_name?: string;
}

export interface DashboardData {
  kpis: { totalPatients: number; totalProfessionals: number; appointmentsToday: number; triageQueue: number; satisfaction: number; };
  upcomingAppointments: Appointment[];
  specialtyStats: { specialty: string; count: number; }[];
  manchesterStats: { manchester_color: string; count: number; }[];
  weeklyStats: { day: string; count: number; }[];
  healthAlerts: { total: number; unread: number; recent: HealthAlert[]; };
  personalStats: { totalConsultations: number; lastConsultation: string | null; };
  dependentes?: Array<{ name: string; cpf?: string; }>;
}

export interface Coupon {
  id: string; code: string; campaign: string; discount: string; redemptions: number;
  max_redemptions: number; valid_until: string; status: string; created_at: string; updated_at: string;
}

export interface DicomStudy {
  id: string; study_instance_uid: string; patient_name: string; patient_id: string;
  patient_birth_date: string; patient_sex: string; study_date: string; study_time: string;
  study_description: string; accession_number: string; modality: string;
  num_series: number; num_instances: number; created_at: string;
}

export interface DicomSeries {
  id: string; study_id: string; series_instance_uid: string; series_number: string;
  series_description: string; modality: string; num_instances: number; created_at: string;
}

export interface DicomInstance {
  id: string; series_id: string; sop_instance_uid: string; instance_number: string;
  file_path: string; rows: number; columns: number; bits_allocated: number; bits_stored: number;
  pixel_spacing: string; slice_thickness: string; window_center: string; window_width: string;
  rescale_intercept: string; rescale_slope: string; photometric_interpretation: string;
  transfer_syntax_uid: string; created_at: string;
}

export interface DicomStudyDetail extends DicomStudy {
  series: DicomSeries[];
  instances: DicomInstance[];
}

export interface PacsSource {
  id: string; name: string; ae_title: string; host: string; port: number;
  protocol: string; description: string; active: boolean; created_at: string;
}
