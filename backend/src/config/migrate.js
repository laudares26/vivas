require('dotenv').config();
const pool = require('./database');

const migration = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (authentication & roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'paciente',
  avatar_color VARCHAR(7) DEFAULT '#0057B8',
  active BOOLEAN DEFAULT true,
  professional_id UUID,
  patient_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  cns VARCHAR(20) UNIQUE,
  birth_date DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zip VARCHAR(10),
  blood_type VARCHAR(5),
  allergies TEXT,
  notes TEXT,
  convenio VARCHAR(50) DEFAULT 'SUS',
  status VARCHAR(20) DEFAULT 'Ativo',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  professional_id VARCHAR(20),
  category VARCHAR(50) NOT NULL,
  specialty VARCHAR(100),
  cnes VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  schedule VARCHAR(20) DEFAULT 'Seg-Sex',
  consultations_month INT DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 4.5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  date_time TIMESTAMP NOT NULL,
  duration_minutes INT DEFAULT 30,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'agendado',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Medical records (atendimentos)
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  date_time TIMESTAMP DEFAULT NOW(),
  chief_complaint TEXT,
  manchester_priority VARCHAR(20),
  systolic_bp INT,
  diastolic_bp INT,
  heart_rate INT,
  temperature DECIMAL(4,1),
  respiratory_rate INT,
  spo2 INT,
  weight DECIMAL(5,2),
  height DECIMAL(4,2),
  icd10_code VARCHAR(10),
  icd10_description VARCHAR(255),
  diagnosis TEXT,
  conduct TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  date_time TIMESTAMP DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'ativa',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prescription items
CREATE TABLE IF NOT EXISTS prescription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  route VARCHAR(50),
  instructions TEXT
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  loinc_code VARCHAR(20),
  exam_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  status VARCHAR(30) DEFAULT 'solicitado',
  result TEXT,
  result_date TIMESTAMP,
  ai_analysis TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Electronic health record entries (timeline)
CREATE TABLE IF NOT EXISTS ehr_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  entry_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Triage records
CREATE TABLE IF NOT EXISTS triage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  manchester_color VARCHAR(20) NOT NULL,
  symptoms TEXT,
  ai_assessment TEXT,
  priority_score INT,
  wait_time_minutes INT,
  status VARCHAR(30) DEFAULT 'aguardando',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Risk predictions
CREATE TABLE IF NOT EXISTS risk_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  cardiovascular_risk DECIMAL(5,2),
  diabetes_risk DECIMAL(5,2),
  hypertension_risk DECIMAL(5,2),
  renal_risk DECIMAL(5,2),
  recommendations TEXT,
  prediction_date TIMESTAMP DEFAULT NOW()
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) UNIQUE NOT NULL,
  campaign VARCHAR(100),
  discount VARCHAR(30),
  redemptions INT DEFAULT 0,
  max_redemptions INT,
  valid_until DATE,
  status VARCHAR(20) DEFAULT 'Ativo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf);
CREATE INDEX IF NOT EXISTS idx_patients_cns ON patients(cns);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date_time);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_status ON triage_records(status);
CREATE INDEX IF NOT EXISTS idx_ehr_patient ON ehr_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- DICOM Studies (Isis DICOM Viewer)
CREATE TABLE IF NOT EXISTS dicom_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_instance_uid VARCHAR(128) UNIQUE,
  patient_name VARCHAR(255),
  patient_id VARCHAR(64),
  patient_birth_date VARCHAR(10),
  patient_sex VARCHAR(4),
  study_date VARCHAR(10),
  study_time VARCHAR(16),
  study_description VARCHAR(255),
  accession_number VARCHAR(64),
  modality VARCHAR(16),
  num_series INT DEFAULT 0,
  num_instances INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- DICOM Series
CREATE TABLE IF NOT EXISTS dicom_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_id UUID REFERENCES dicom_studies(id) ON DELETE CASCADE,
  series_instance_uid VARCHAR(128) UNIQUE,
  series_number VARCHAR(10),
  series_description VARCHAR(255),
  modality VARCHAR(16),
  num_instances INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DICOM Instances (individual files)
CREATE TABLE IF NOT EXISTS dicom_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES dicom_series(id) ON DELETE CASCADE,
  sop_instance_uid VARCHAR(128),
  instance_number VARCHAR(10),
  file_path TEXT,
  rows INT,
  columns INT,
  bits_allocated INT,
  bits_stored INT,
  pixel_spacing VARCHAR(50),
  slice_thickness VARCHAR(20),
  window_center VARCHAR(50),
  window_width VARCHAR(50),
  rescale_intercept VARCHAR(20),
  rescale_slope VARCHAR(20),
  photometric_interpretation VARCHAR(30),
  transfer_syntax_uid VARCHAR(128),
  created_at TIMESTAMP DEFAULT NOW()
);

-- DICOM PACS Sources
CREATE TABLE IF NOT EXISTS dicom_pacs_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  ae_title VARCHAR(16),
  host VARCHAR(255),
  port INT DEFAULT 104,
  protocol VARCHAR(20) DEFAULT 'DIMSE',
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DICOM Indexes
CREATE INDEX IF NOT EXISTS idx_dicom_studies_patient ON dicom_studies(patient_name);
CREATE INDEX IF NOT EXISTS idx_dicom_studies_date ON dicom_studies(study_date);
CREATE INDEX IF NOT EXISTS idx_dicom_studies_modality ON dicom_studies(modality);
CREATE INDEX IF NOT EXISTS idx_dicom_series_study ON dicom_series(study_id);
CREATE INDEX IF NOT EXISTS idx_dicom_instances_series ON dicom_instances(series_id);

-- Professional-Patient relationships (data isolation)
CREATE TABLE IF NOT EXISTS professional_patient_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(professional_user_id, patient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ppr_professional ON professional_patient_relationships(professional_user_id);
CREATE INDEX IF NOT EXISTS idx_ppr_patient ON professional_patient_relationships(patient_user_id);

-- Health notifications (alerts sent to patients/professionals)
CREATE TABLE IF NOT EXISTS health_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_data JSONB NOT NULL,
  notified_professionals JSONB,
  read_by_patient BOOLEAN DEFAULT false,
  read_by_professional BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_notifications_patient ON health_notifications(patient_user_id);

-- Preventive health indicators (stored values per patient)
CREATE TABLE IF NOT EXISTS health_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  indicator_name VARCHAR(50) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20),
  recorded_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_health_indicators_patient ON health_indicators(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_health_indicators_name ON health_indicators(indicator_name);

-- Add new columns if they don't exist (safe migration)
DO $$ BEGIN
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS convenio VARCHAR(50) DEFAULT 'SUS';
  ALTER TABLE patients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativo';
  ALTER TABLE professionals ADD COLUMN IF NOT EXISTS schedule VARCHAR(20) DEFAULT 'Seg-Sex';
  ALTER TABLE professionals ADD COLUMN IF NOT EXISTS consultations_month INT DEFAULT 0;
  ALTER TABLE professionals ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 4.5;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
`;

async function migrate() {
  try {
    await pool.query(migration);
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
