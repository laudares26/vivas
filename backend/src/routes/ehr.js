const router = require('express').Router();
const pool = require('../config/database');

router.get('/:patientId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ehr_entries WHERE patient_id = $1 ORDER BY created_at DESC',
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, entry_type, title, description, metadata } = req.body;
    const result = await pool.query(
      `INSERT INTO ehr_entries (patient_id, entry_type, title, description, metadata)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [patient_id, entry_type, title, description, metadata ? JSON.stringify(metadata) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar entrada no prontuário' });
  }
});

module.exports = router;
