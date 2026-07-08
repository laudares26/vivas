require('dotenv').config();
const pool = require('../config/database');

async function run() {
  // 1. Add Bruno Correa to patients table
  const patResult = await pool.query(
    `INSERT INTO patients (full_name, cpf, cns, birth_date, gender, phone, email, address_city, address_state, blood_type, allergies, convenio, status)
     VALUES ('Bruno Correa', '999.888.777-66', '898 0001 2345 0011', '1990-04-12', 'Masculino', '(31) 99888-1234', 'brunocorreafotografo@gmail.com', 'Belo Horizonte', 'MG', 'A+', NULL, 'Unimed', 'Ativo')
     ON CONFLICT (cpf) DO UPDATE SET full_name = 'Bruno Correa' RETURNING id`
  );
  const patientId = patResult.rows[0].id;
  console.log('Bruno Correa patient table id:', patientId);

  // 2. Add risk predictions for Bruno Correa (high risk values showing progression)
  const predictions = [
    { cardio: 72, diabetes: 68, hypertension: 78, renal: 45, date: '2026-01-15' },
    { cardio: 74, diabetes: 70, hypertension: 80, renal: 48, date: '2026-02-15' },
    { cardio: 76, diabetes: 72, hypertension: 82, renal: 50, date: '2026-03-15' },
    { cardio: 78, diabetes: 75, hypertension: 85, renal: 52, date: '2026-04-15' },
    { cardio: 80, diabetes: 77, hypertension: 86, renal: 55, date: '2026-05-15' },
    { cardio: 82, diabetes: 79, hypertension: 88, renal: 58, date: '2026-06-10' },
  ];

  for (const p of predictions) {
    await pool.query(
      `INSERT INTO risk_predictions (patient_id, cardiovascular_risk, diabetes_risk, hypertension_risk, renal_risk, recommendations, prediction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [patientId, p.cardio, p.diabetes, p.hypertension, p.renal,
       'Paciente com alto risco cardiovascular e hipertensivo. Recomenda-se: controle rigoroso da pressão arterial, dieta hipossódica, atividade física regular (150 min/semana), monitoramento glicêmico, e retorno em 30 dias para reavaliação.',
       p.date]
    );
  }
  console.log('Added', predictions.length, 'risk predictions for Bruno Correa');

  // 3. Also update the professionals table to replace Ricardo with Bruno Hodos (if not already)
  await pool.query(
    `UPDATE professionals SET full_name = 'Dr. Bruno Hodos', email = 'bruno.hodos@gmail.com' WHERE cpf = '111.222.333-44'`
  );
  console.log('Updated professionals table');

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
