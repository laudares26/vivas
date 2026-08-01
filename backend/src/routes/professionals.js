const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = 'SELECT * FROM professionals';
    const params = [];
    const conditions = [];

    // A patient may only see the professional(s) linked to them (care team).
    // This keeps agendamento/teleconsulta scoped to their own doctor instead of
    // exposing the whole platform roster.
    if (req.user && req.user.role === 'paciente') {
      params.push(req.user.id);
      conditions.push(`email IN (
        SELECT u.email FROM users u
        JOIN professional_patient_relationships ppr ON ppr.professional_user_id = u.id
        WHERE ppr.patient_user_id = $${params.length}
      )`);
    }

    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR professional_id ILIKE $${params.length} OR specialty ILIKE $${params.length})`);
    }
    if (active !== undefined) {
      params.push(active === 'true');
      conditions.push(`active = $${params.length}`);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY full_name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar profissionais' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM professionals WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar profissional' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { full_name, cpf, professional_id, category, specialty, cnes, phone, email } = req.body;
    const result = await pool.query(
      `INSERT INTO professionals (full_name, cpf, professional_id, category, specialty, cnes, phone, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [full_name, cpf, professional_id, category, specialty, cnes, phone, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'CPF já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar profissional' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { full_name, cpf, professional_id, category, specialty, cnes, phone, email, active } = req.body;
    const result = await pool.query(
      `UPDATE professionals SET full_name=$1, cpf=$2, professional_id=$3, category=$4, specialty=$5, 
       cnes=$6, phone=$7, email=$8, active=$9, updated_at=NOW() WHERE id=$10 RETURNING *`,
      [full_name, cpf, professional_id, category, specialty, cnes, phone, email, active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'CPF já cadastrado' });
    res.status(500).json({ error: 'Erro ao atualizar profissional' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM professionals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json({ message: 'Profissional removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover profissional' });
  }
});

// Professional onboarding - public (no auth required)
const bcrypt = require('bcryptjs');
const { generateMedicoContract, generatePsicologoContract } = require('../services/contracts');

async function onboardingHandler(req, res) {
  try {
    const { type, nome, sobrenome, email, nascimento, celular, registro, registroUf, cpf, especialidade, signature } = req.body;

    if (!nome || !sobrenome || !email || !registro || !cpf) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    // Create professionals_onboarding table if needed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professionals_onboarding (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        sobrenome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        nascimento DATE,
        celular VARCHAR(50),
        registro VARCHAR(50) NOT NULL,
        registro_uf VARCHAR(2),
        cpf VARCHAR(20) NOT NULL,
        especialidade VARCHAR(100),
        signature_data TEXT,
        contract_signed BOOLEAN DEFAULT true,
        contract_date TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert professional
    const result = await pool.query(
      `INSERT INTO professionals_onboarding (type, nome, sobrenome, email, nascimento, celular, registro, registro_uf, cpf, especialidade, signature_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [type, nome, sobrenome, email, nascimento || null, celular || null, registro, registroUf || null, cpf, especialidade || null, signature || null]
    );
    const profId = result.rows[0].id;

    // Create user account with temp password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPassword, 10);
    const role = type === 'medico' ? 'medico' : 'psicologo';
    const fullName = type === 'medico' ? `Dr(a). ${nome} ${sobrenome}` : `${nome} ${sobrenome}`;

    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color, active)
       VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT (email) DO NOTHING`,
      [email, hash, fullName, role, type === 'medico' ? '#2563EB' : '#EC4899']
    );

    // Also insert into professionals table
    const regLabel = type === 'medico' ? 'CRM' : 'CRP';
    const category = type === 'medico' ? 'Médico' : 'Psicólogo';
    await pool.query(
      `INSERT INTO professionals (full_name, cpf, professional_id, category, specialty, phone, email, schedule, consultations_month, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Seg-Sex', 0, 5.0) ON CONFLICT (cpf) DO NOTHING`,
      [fullName, cpf, `${regLabel}-${registroUf} ${registro}`, category, especialidade || 'Geral', celular || '', email]
    );

    // Send contract email using full template
    {
      const { sendRawEmail } = require('../services/notifications');
      const contractData = { fullName, cpf, registro, registroUf, especialidade, email, tempPassword };
      const html = type === 'medico'
        ? generateMedicoContract(contractData)
        : generatePsicologoContract(contractData);

      const subjectType = type === 'medico' ? 'Medico' : 'Psicologo';
      const result = await sendRawEmail({
        to: email,
        subject: `vivas - Contrato de Credenciamento ${subjectType} assinado`,
        html
      });
      console.log(`[ONBOARDING] Contract email dispatch to ${email} - success: ${result.success}`);
    }

    res.json({ success: true, id: profId });
  } catch (err) {
    console.error('Onboarding error:', err);
    if (err.code === '23505') return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    res.status(500).json({ error: 'Erro ao processar cadastro' });
  }
}

module.exports = router;
module.exports.onboardingHandler = onboardingHandler;
