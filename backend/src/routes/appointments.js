const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { date, status, professional_id, patient_id } = req.query;
    let query = `SELECT a.*, p.full_name as patient_name, pr.full_name as professional_name, pr.specialty
                 FROM appointments a
                 LEFT JOIN patients p ON a.patient_id = p.id
                 LEFT JOIN professionals pr ON a.professional_id = pr.id`;
    const params = [];
    const conditions = [];

    if (date) {
      params.push(date);
      conditions.push(`DATE(a.date_time) = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (professional_id) {
      params.push(professional_id);
      conditions.push(`a.professional_id = $${params.length}`);
    }
    if (patient_id) {
      params.push(patient_id);
      conditions.push(`a.patient_id = $${params.length}`);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY a.date_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, professional_id, date_time, duration_minutes, type, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO appointments (patient_id, professional_id, date_time, duration_minutes, type, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_id, professional_id, date_time, duration_minutes || 30, type, status || 'agendado', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { patient_id, professional_id, date_time, duration_minutes, type, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE appointments SET patient_id=$1, professional_id=$2, date_time=$3, duration_minutes=$4,
       type=$5, status=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [patient_id, professional_id, date_time, duration_minutes, type, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ message: 'Agendamento removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover agendamento' });
  }
});

module.exports = router;
