const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { patient_id, status } = req.query;
    let query = `SELECT e.*, p.full_name as patient_name, pr.full_name as professional_name
                 FROM exams e
                 LEFT JOIN patients p ON e.patient_id = p.id
                 LEFT JOIN professionals pr ON e.professional_id = pr.id`;
    const params = [];
    const conditions = [];
    if (patient_id) { params.push(patient_id); conditions.push(`e.patient_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`e.status = $${params.length}`); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY e.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar exames' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, professional_id, medical_record_id, loinc_code, exam_name, category, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO exams (patient_id, professional_id, medical_record_id, loinc_code, exam_name, category, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_id, professional_id, medical_record_id, loinc_code, exam_name, category, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao solicitar exame' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, result: examResult, ai_analysis } = req.body;
    const result = await pool.query(
      `UPDATE exams SET status=$1, result=$2, ai_analysis=$3, result_date=CASE WHEN $1='concluido' THEN NOW() ELSE result_date END, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [status, examResult, ai_analysis, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exame não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar exame' });
  }
});

module.exports = router;
