const router = require('express').Router();
const pool = require('../config/database');
const { sendInvitePatientEmail } = require('../services/notifications');

// Health-professional roles create appointments only for themselves.
const PROFESSIONAL_ROLES = ['medico', 'psicologo'];

// Resolve the professionals row that belongs to a logged-in professional user.
// Professional users authenticate against `users`; appointments reference `professionals`.
// They are linked by email (see professionals onboarding/creation).
async function resolveProfessionalId(user) {
  const byEmail = await pool.query('SELECT id FROM professionals WHERE email = $1 ORDER BY created_at ASC LIMIT 1', [user.email]);
  return byEmail.rows.length ? byEmail.rows[0].id : null;
}

let schemaReady = null;
// Lazily ensure the invite/first-free columns and the invites table exist.
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_first_free BOOLEAN DEFAULT false`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS patient_invites (
          id SERIAL PRIMARY KEY,
          appointment_id UUID,
          patient_id UUID,
          patient_name VARCHAR(255),
          patient_email VARCHAR(255) NOT NULL,
          professional_id UUID,
          invited_by_user_id UUID,
          discount_code VARCHAR(40) UNIQUE NOT NULL,
          discount_percent INT DEFAULT 5,
          invite_email_sent BOOLEAN DEFAULT false,
          followup_email_sent BOOLEAN DEFAULT false,
          status VARCHAR(20) DEFAULT 'invited',
          created_at TIMESTAMP DEFAULT NOW(),
          attended_at TIMESTAMP,
          registered_at TIMESTAMP
        )`);
    })().catch(e => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

function generateDiscountCode() {
  return 'VIVAS5-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Find or create a patients row for an invited (not-yet-registered) patient by email.
async function resolveInvitedPatient(name, email) {
  const existing = await pool.query('SELECT id FROM patients WHERE email = $1 ORDER BY created_at ASC LIMIT 1', [email]);
  if (existing.rows.length) return existing.rows[0].id;
  const created = await pool.query(
    `INSERT INTO patients (full_name, cpf, birth_date, gender, email, convenio, status)
     VALUES ($1, $2, NOW(), 'Não informado', $3, 'VivaS', 'Ativo')
     RETURNING id`,
    [name || email, 'inv-' + Math.random().toString(36).slice(2, 10), email]
  );
  return created.rows[0].id;
}

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
    } else if (PROFESSIONAL_ROLES.includes(req.user.role)) {
      // A professional only ever sees their own appointments.
      const ownProfessionalId = await resolveProfessionalId(req.user);
      params.push(ownProfessionalId || '00000000-0000-0000-0000-000000000000');
      conditions.push(`a.professional_id = $${params.length}`);
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
    await ensureSchema();
    let { patient_id, professional_id, date_time, duration_minutes, type, status, notes,
          invite_new_patient, patient_name, patient_email } = req.body;

    // A patient books only for themselves: ignore any patient_id from the body.
    if (req.user.role === 'paciente') {
      patient_id = await resolvePatientId(req.user);
      invite_new_patient = false;
    }

    // A professional is always the professional of their own appointments:
    // force professional_id to the logged-in professional, ignoring the body.
    if (PROFESSIONAL_ROLES.includes(req.user.role)) {
      const ownProfessionalId = await resolveProfessionalId(req.user);
      if (!ownProfessionalId) return res.status(400).json({ error: 'Seu cadastro de profissional não foi encontrado' });
      professional_id = ownProfessionalId;
    }

    const isInvite = !!invite_new_patient;
    if (isInvite) {
      if (!patient_email) return res.status(400).json({ error: 'Informe o e-mail do paciente convidado' });
      patient_id = await resolveInvitedPatient(patient_name, patient_email);
    }

    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });
    if (!professional_id) return res.status(400).json({ error: 'Selecione um profissional' });
    if (!date_time) return res.status(400).json({ error: 'Informe a data e hora' });

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, professional_id, date_time, duration_minutes, type, status, notes, is_first_free)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patient_id, professional_id, date_time, duration_minutes || 30, type || 'Consulta', status || 'agendado', notes, isInvite]
    );
    const appointment = result.rows[0];

    if (isInvite) {
      const prof = await pool.query('SELECT full_name, specialty FROM professionals WHERE id = $1', [professional_id]);
      const professionalName = prof.rows[0]?.full_name || 'seu profissional';
      const specialty = prof.rows[0]?.specialty || '';

      const discountCode = generateDiscountCode();
      await pool.query(
        `INSERT INTO patient_invites (appointment_id, patient_id, patient_name, patient_email, professional_id, invited_by_user_id, discount_code, invite_email_sent, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,'invited')`,
        [appointment.id, patient_id, patient_name || null, patient_email, professional_id, req.user.id, discountCode]
      );

      sendInvitePatientEmail({
        patientName: patient_name, patientEmail: patient_email,
        professionalName, specialty, dateTime: date_time, notes,
      }).catch(e => console.error('[appointments] invite email failed:', e.message));
    }

    res.status(201).json(appointment);
  } catch (err) {
    console.error('[appointments] create error:', err.message);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    await ensureSchema();
    let { patient_id, professional_id, date_time, duration_minutes, type, status, notes } = req.body;

    // A professional cannot reassign an appointment to another professional.
    if (PROFESSIONAL_ROLES.includes(req.user.role)) {
      const ownProfessionalId = await resolveProfessionalId(req.user);
      professional_id = ownProfessionalId;
    }

    const result = await pool.query(
      `UPDATE appointments SET patient_id=$1, professional_id=$2, date_time=$3, duration_minutes=$4,
       type=$5, status=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [patient_id, professional_id, date_time, duration_minutes, type, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // When an invited patient's first free consultation is concluded, send the 5% discount email once.
    if (status === 'concluido' && result.rows[0].is_first_free) {
      await maybeSendDiscountFollowup(req.params.id);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[appointments] update error:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

async function maybeSendDiscountFollowup(appointmentId) {
  const invite = await pool.query(
    `SELECT * FROM patient_invites WHERE appointment_id = $1 AND followup_email_sent = false LIMIT 1`,
    [appointmentId]
  );
  if (!invite.rows.length) return;
  const inv = invite.rows[0];
  await pool.query(
    `UPDATE patient_invites SET followup_email_sent = true, status = 'attended', attended_at = NOW() WHERE id = $1`,
    [inv.id]
  );
  const { sendPostConsultDiscountEmail } = require('../services/notifications');
  sendPostConsultDiscountEmail({
    patientName: inv.patient_name,
    patientEmail: inv.patient_email,
    discountCode: inv.discount_code,
    discountPercent: inv.discount_percent || 5,
  }).catch(e => console.error('[appointments] discount email failed:', e.message));
}

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
