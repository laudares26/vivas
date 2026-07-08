const router = require('express').Router();
const pool = require('../config/database');

const PROFESSIONAL_ROLES = ['medico', 'psicologo'];

router.get('/:patientId', async (req, res) => {
  try {
    // Data isolation: verify the requesting user has access to this patient
    const patient = await pool.query('SELECT email FROM patients WHERE id = $1', [req.params.patientId]);
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });

    const patientEmail = patient.rows[0].email;
    if (PROFESSIONAL_ROLES.includes(req.user.role)) {
      const check = await pool.query(
        `SELECT 1 FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.patient_user_id
         WHERE ppr.professional_user_id = $1 AND u.email = $2`,
        [req.user.id, patientEmail]
      );
      if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });
    } else if (req.user.role === 'paciente' && patientEmail !== req.user.email) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

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
