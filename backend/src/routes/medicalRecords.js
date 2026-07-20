const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { patient_id, professional_id } = req.query;
    let query = `SELECT mr.*, p.full_name as patient_name, pr.full_name as professional_name
                 FROM medical_records mr
                 LEFT JOIN patients p ON mr.patient_id = p.id
                 LEFT JOIN professionals pr ON mr.professional_id = pr.id`;
    const params = [];
    const conditions = [];

    // Data isolation: professional sees only records they authored; patient only their own
    if (['medico', 'psicologo'].includes(req.user.role)) {
      params.push(req.user.email);
      conditions.push(`mr.professional_id IN (SELECT id FROM professionals WHERE email = $${params.length})`);
    } else if (req.user.role === 'paciente') {
      params.push(req.user.email);
      conditions.push(`mr.patient_id IN (SELECT id FROM patients WHERE email = $${params.length})`);
    }

    if (patient_id) { params.push(patient_id); conditions.push(`mr.patient_id = $${params.length}`); }
    if (professional_id) { params.push(professional_id); conditions.push(`mr.professional_id = $${params.length}`); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY mr.date_time DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atendimentos' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mr.*, p.full_name as patient_name, pr.full_name as professional_name
       FROM medical_records mr
       LEFT JOIN patients p ON mr.patient_id = p.id
       LEFT JOIN professionals pr ON mr.professional_id = pr.id
       WHERE mr.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Atendimento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atendimento' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, professional_id, appointment_id, chief_complaint, manchester_priority,
      systolic_bp, diastolic_bp, heart_rate, temperature, respiratory_rate, spo2, weight, height,
      icd10_code, icd10_description, diagnosis, conduct, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO medical_records (patient_id, professional_id, appointment_id, chief_complaint, manchester_priority,
       systolic_bp, diastolic_bp, heart_rate, temperature, respiratory_rate, spo2, weight, height,
       icd10_code, icd10_description, diagnosis, conduct, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [patient_id, professional_id, appointment_id, chief_complaint, manchester_priority,
       systolic_bp, diastolic_bp, heart_rate, temperature, respiratory_rate, spo2, weight, height,
       icd10_code, icd10_description, diagnosis, conduct, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar atendimento' });
  }
});

module.exports = router;
