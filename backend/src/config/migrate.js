require('dotenv').config();
const pool = require('./database');

const migration = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Indexes
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
