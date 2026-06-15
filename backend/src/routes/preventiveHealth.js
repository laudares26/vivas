const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('./auth');
const { checkAndNotify, THRESHOLDS, classifyIndicator } = require('../services/notifications');

const router = express.Router();

// POST /api/preventive-health/indicators — submit indicators and trigger alerts
router.post('/indicators', authenticate, async (req, res) => {
  try {
    const { indicators } = req.body;
    // indicators: [{ name: 'glicemia_jejum', value: 130 }, ...]
    if (!indicators || !Array.isArray(indicators) || indicators.length === 0) {
      return res.status(400).json({ error: 'Indicadores são obrigatórios' });
    }

    const patientUserId = req.user.id;

    // Store indicators
    for (const ind of indicators) {
      const threshold = THRESHOLDS[ind.name];
      await pool.query(
        `INSERT INTO health_indicators (patient_user_id, indicator_name, value, unit, recorded_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [patientUserId, ind.name, ind.value, threshold ? threshold.unit : ind.unit || '']
      );
    }

    // Check thresholds and notify if needed
    const result = await checkAndNotify(patientUserId, indicators);

    res.json({
      stored: indicators.length,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/preventive-health/indicators — get patient's indicator history
router.get('/indicators', authenticate, async (req, res) => {
  try {
    const patientId = req.query.patient_id || req.user.id;

    // Professionals can view their patients' data
    if (patientId !== req.user.id && req.user.role !== 'admin') {
      const rel = await pool.query(
        `SELECT 1 FROM professional_patient_relationships 
         WHERE professional_user_id = $1 AND patient_user_id = $2`,
        [req.user.id, patientId]
      );
      if (rel.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado — paciente não vinculado' });
      }
    }

    const result = await pool.query(
      `SELECT indicator_name, value, unit, recorded_at, source
       FROM health_indicators WHERE patient_user_id = $1
       ORDER BY recorded_at DESC LIMIT 100`,
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/preventive-health/notifications — get patient's notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const isProfessional = ['medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'].includes(req.user.role);

    let result;
    if (isProfessional || req.user.role === 'admin') {
      // Professionals see notifications of their patients
      result = await pool.query(
        `SELECT hn.*, u.full_name as patient_name
         FROM health_notifications hn
         JOIN users u ON u.id = hn.patient_user_id
         JOIN professional_patient_relationships ppr ON ppr.patient_user_id = hn.patient_user_id
         WHERE ppr.professional_user_id = $1
         ORDER BY hn.created_at DESC LIMIT 50`,
        [userId]
      );
    } else {
      // Patients see their own notifications
      result = await pool.query(
        `SELECT * FROM health_notifications WHERE patient_user_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [userId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/preventive-health/notifications/:id/read — mark notification as read
router.post('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const isProfessional = ['medico', 'enfermeiro', 'psicologo', 'fisioterapeuta', 'admin'].includes(req.user.role);
    const field = isProfessional ? 'read_by_professional' : 'read_by_patient';
    await pool.query(
      `UPDATE health_notifications SET ${field} = true WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/preventive-health/thresholds — get threshold definitions
router.get('/thresholds', authenticate, (req, res) => {
  res.json(THRESHOLDS);
});

// POST /api/preventive-health/simulate-alert — test notification with sample data
router.post('/simulate-alert', authenticate, async (req, res) => {
  try {
    const patientUserId = req.query.patient_id || req.user.id;

    // Simulate critical indicators
    const testIndicators = [
      { name: 'glicemia_jejum', value: 142 },
      { name: 'colesterol_ldl', value: 175 },
      { name: 'pressao_sistolica', value: 155 },
    ];

    const result = await checkAndNotify(patientUserId, testIndicators);
    res.json({
      message: 'Simulação de alerta executada',
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
