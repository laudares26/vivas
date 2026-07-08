const router = require('express').Router();
const pool = require('../config/database');

// Resolve (or lazily create) the patients row for a logged-in patient user.
// Patient users authenticate against `users`; appointments reference `patients`.
async function resolvePatientId(user) {
  const byUser = await pool.query('SELECT id FROM patients WHERE user_id = $1', [user.id]);
  if (byUser.rows.length) return byUser.rows[0].id;

  const byEmail = await pool.query('SELECT id FROM patients WHERE email = $1', [user.email]);
  if (byEmail.rows.length) {
    await pool.query('UPDATE patients SET user_id = $1 WHERE id = $2', [user.id, byEmail.rows[0].id]);
    return byEmail.rows[0].id;
  }

  const created = await pool.query(
    `INSERT INTO patients (full_name, cpf, birth_date, gender, email, user_id, convenio, status)
     VALUES ($1, $2, NOW(), 'Não informado', $3, $4, 'VivaS', 'Ativo')
     RETURNING id`,
    [user.full_name || user.email, 'auto-' + String(user.id).substring(0, 8), user.email, user.id]
  );
  await pool.query('UPDATE users SET patient_id = $1 WHERE id = $2', [created.rows[0].id, user.id]);
  return created.rows[0].id;
}

router.get('/', async (req, res) => {
  try {
    const { date, status, professional_id, patient_id } = req.query;
    let query = `SELECT a.*, p.full_name as patient_name, pr.full_name as professional_name, pr.specialty
                 FROM appointments a
                 LEFT JOIN patients p ON a.patient_id = p.id
                 LEFT JOIN professionals pr ON a.professional_id = pr.id`;
    const params = [];
    const conditions = [];

    // Data isolation: a patient only ever sees their own appointments.
    if (req.user.role === 'paciente') {
      const ownPatientId = await resolvePatientId(req.user);
      params.push(ownPatientId);
      conditions.push(`a.patient_id = $${params.length}`);
    }

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
    let { patient_id, professional_id, date_time, duration_minutes, type, status, notes } = req.body;

    // A patient books only for themselves: ignore any patient_id from the body.
    if (req.user.role === 'paciente') {
      patient_id = await resolvePatientId(req.user);
    }

    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });
    if (!professional_id) return res.status(400).json({ error: 'Selecione um profissional' });
    if (!date_time) return res.status(400).json({ error: 'Informe a data e hora' });

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, professional_id, date_time, duration_minutes, type, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_id, professional_id, date_time, duration_minutes || 30, type || 'Consulta', status || 'agendado', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[appointments] create error:', err.message);
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
