const router = require('express').Router();
const pool = require('../config/database');

router.get('/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // Data isolation: a professional may only view prontuários of their linked
    // patients; a patient may only view their own. Admin sees everyone.
    if (['medico', 'psicologo'].includes(req.user.role)) {
      const allowed = await pool.query(
        `SELECT 1 WHERE
           EXISTS (SELECT 1 FROM patients p WHERE p.id = $1 AND p.email IN (
             SELECT u.email FROM users u
             JOIN professional_patient_relationships ppr ON ppr.patient_user_id = u.id
             WHERE ppr.professional_user_id = $2))
           OR EXISTS (SELECT 1 FROM medical_records mr JOIN professionals pr ON pr.id = mr.professional_id
                      WHERE pr.email = $3 AND mr.patient_id = $1)
           OR EXISTS (SELECT 1 FROM appointments a JOIN professionals pr ON pr.id = a.professional_id
                      WHERE pr.email = $3 AND a.patient_id = $1)
         LIMIT 1`,
        [patientId, req.user.id, req.user.email]
      );
      if (allowed.rowCount === 0) return res.json([]);
    } else if (req.user.role === 'paciente') {
      const allowed = await pool.query(
        'SELECT 1 FROM patients WHERE id = $1 AND email = $2 LIMIT 1',
        [patientId, req.user.email]
      );
      if (allowed.rowCount === 0) return res.json([]);
    }

    // Aggregate a complete timeline from the real clinical tables (consultas,
    // exames, prescrições) plus any manual ehr_entries, so the professional sees
    // the full prontuário — not only the (usually empty) ehr_entries table.
    const result = await pool.query(
      `
      SELECT id, patient_id, entry_type, title, description, metadata, created_at FROM (
        SELECT mr.id, mr.patient_id, 'consulta'::text AS entry_type,
               COALESCE(NULLIF(mr.diagnosis, ''), NULLIF(mr.chief_complaint, ''), 'Atendimento clínico') AS title,
               COALESCE(NULLIF(mr.conduct, ''), NULLIF(mr.notes, ''), mr.icd10_description, '') AS description,
               jsonb_build_object('icd10', mr.icd10_code, 'priority', mr.manchester_priority) AS metadata,
               COALESCE(mr.date_time, mr.created_at) AS created_at
        FROM medical_records mr WHERE mr.patient_id = $1

        UNION ALL

        SELECT e.id, e.patient_id, 'exame'::text AS entry_type,
               e.exam_name AS title,
               COALESCE(NULLIF(e.result, ''), e.status, '') AS description,
               jsonb_build_object('category', e.category, 'status', e.status, 'result', e.result) AS metadata,
               COALESCE(e.result_date, e.created_at) AS created_at
        FROM exams e WHERE e.patient_id = $1

        UNION ALL

        SELECT pr.id, pr.patient_id, 'medicamento'::text AS entry_type,
               'Prescrição médica' AS title,
               COALESCE((SELECT string_agg(pi.medication_name || COALESCE(' ' || pi.dosage, ''), ', ')
                         FROM prescription_items pi WHERE pi.prescription_id = pr.id), 'Sem itens') AS description,
               jsonb_build_object('status', pr.status) AS metadata,
               COALESCE(pr.date_time, pr.created_at) AS created_at
        FROM prescriptions pr WHERE pr.patient_id = $1

        UNION ALL

        SELECT eh.id, eh.patient_id, eh.entry_type, eh.title, eh.description,
               eh.metadata, eh.created_at
        FROM ehr_entries eh WHERE eh.patient_id = $1
      ) timeline
      ORDER BY created_at DESC
      `,
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[EHR] Error:', err);
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
