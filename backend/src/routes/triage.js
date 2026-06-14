const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT t.*, p.full_name as patient_name, p.birth_date, p.gender
                 FROM triage_records t
                 LEFT JOIN patients p ON t.patient_id = p.id`;
    const params = [];
    if (status) { params.push(status); query += ` WHERE t.status = $1`; }
    query += ' ORDER BY CASE t.manchester_color WHEN \'vermelho\' THEN 1 WHEN \'laranja\' THEN 2 WHEN \'amarelo\' THEN 3 WHEN \'verde\' THEN 4 WHEN \'azul\' THEN 5 END ASC, t.created_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar triagem' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, manchester_color, symptoms, ai_assessment, priority_score, wait_time_minutes } = req.body;
    const result = await pool.query(
      `INSERT INTO triage_records (patient_id, manchester_color, symptoms, ai_assessment, priority_score, wait_time_minutes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_id, manchester_color, symptoms, ai_assessment, priority_score, wait_time_minutes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar triagem' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { manchester_color, status, ai_assessment } = req.body;
    const result = await pool.query(
      `UPDATE triage_records SET manchester_color=COALESCE($1,manchester_color), status=COALESCE($2,status), 
       ai_assessment=COALESCE($3,ai_assessment), updated_at=NOW() WHERE id=$4 RETURNING *`,
      [manchester_color, status, ai_assessment, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Triagem não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar triagem' });
  }
});

module.exports = router;
