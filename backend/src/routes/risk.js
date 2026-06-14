const router = require('express').Router();
const pool = require('../config/database');

router.get('/:patientId', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM risk_predictions WHERE patient_id = $1 ORDER BY prediction_date DESC',
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar predições' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, cardiovascular_risk, diabetes_risk, hypertension_risk, renal_risk, recommendations } = req.body;
    const result = await pool.query(
      `INSERT INTO risk_predictions (patient_id, cardiovascular_risk, diabetes_risk, hypertension_risk, renal_risk, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patient_id, cardiovascular_risk, diabetes_risk, hypertension_risk, renal_risk, recommendations]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar predição' });
  }
});

module.exports = router;
