const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `SELECT pr.*, p.full_name as patient_name, prof.full_name as professional_name,
                 json_agg(json_build_object('id', pi.id, 'medication_name', pi.medication_name, 'dosage', pi.dosage, 
                   'frequency', pi.frequency, 'duration', pi.duration, 'route', pi.route, 'instructions', pi.instructions)) as items
                 FROM prescriptions pr
                 LEFT JOIN patients p ON pr.patient_id = p.id
                 LEFT JOIN professionals prof ON pr.professional_id = prof.id
                 LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id`;
    const params = [];
    const conditions = [];

    // Data isolation: professional sees prescriptions they issued; patient only their own
    if (['medico', 'psicologo'].includes(req.user.role)) {
      params.push(req.user.email);
      conditions.push(`pr.professional_id IN (SELECT id FROM professionals WHERE email = $${params.length})`);
    } else if (req.user.role === 'paciente') {
      params.push(req.user.email);
      conditions.push(`pr.patient_id IN (SELECT id FROM patients WHERE email = $${params.length})`);
    }

    if (patient_id) { params.push(patient_id); conditions.push(`pr.patient_id = $${params.length}`); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY pr.id, p.full_name, prof.full_name ORDER BY pr.date_time DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prescrições' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, p.full_name as patient_name, p.cpf as patient_cpf, p.cns as patient_cns,
       prof.full_name as professional_name, prof.professional_id as professional_reg, prof.specialty,
       json_agg(json_build_object('id', pi.id, 'medication_name', pi.medication_name, 'dosage', pi.dosage,
         'frequency', pi.frequency, 'duration', pi.duration, 'route', pi.route, 'instructions', pi.instructions)) as items
       FROM prescriptions pr
       LEFT JOIN patients p ON pr.patient_id = p.id
       LEFT JOIN professionals prof ON pr.professional_id = prof.id
       LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
       WHERE pr.id = $1
       GROUP BY pr.id, p.full_name, p.cpf, p.cns, prof.full_name, prof.professional_id, prof.specialty`,
      [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prescrição não encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar prescrição' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, professional_id, medical_record_id, items, notes } = req.body;
    const presResult = await pool.query(
      `INSERT INTO prescriptions (patient_id, professional_id, medical_record_id, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [patient_id, professional_id, medical_record_id, notes]
    );
    const prescription = presResult.rows[0];
    
    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, route, instructions)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [prescription.id, item.medication_name, item.dosage, item.frequency, item.duration, item.route, item.instructions]
        );
      }
    }

    res.status(201).json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar prescrição' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM prescriptions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prescrição não encontrada' });
    res.json({ message: 'Prescrição removida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover prescrição' });
  }
});

module.exports = router;
