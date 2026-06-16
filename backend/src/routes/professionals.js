const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    let query = 'SELECT * FROM professionals';
    const params = [];
    const conditions = [];

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

    // Send contract email
    const nodemailer = require('nodemailer');
    const smtpUser = process.env.SMTP_USER || 'sandrolaudares@gmail.com';
    const smtpPass = process.env.SMTP_PASS;

    if (smtpPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass }
      });

      const contractDate = new Date().toLocaleDateString('pt-BR');
      const html = `
        <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#7B1E3C;font-size:28px;margin:0">VivaS</h1>
            <p style="color:#6B7280;font-size:14px;margin-top:4px">Contrato de Prestação de Serviços</p>
          </div>
          <p style="font-size:15px;color:#1A1A2E">Olá, <strong>${fullName}</strong>!</p>
          <p style="font-size:14px;color:#6B7280;line-height:1.6">Seu cadastro como profissional de saúde na VivaS foi realizado com sucesso. Segue abaixo seu contrato assinado eletronicamente:</p>

          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:24px;margin:20px 0;font-size:12px;line-height:1.8;color:#1A1A2E">
            <h3 style="text-align:center;color:#5E1730;margin-bottom:12px">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PROFISSIONAIS</h3>
            <p><strong>CONTRATANTE:</strong> CROSSGEO LTDA, CNPJ 56.195.515/0001-49, R. da Patagonia, 404, Apt. 301, Sion, Belo Horizonte/MG, CEP 30.320-135, representando a plataforma VivaS Saúde Inteligente.</p>
            <p><strong>CONTRATADO(A):</strong> ${fullName}, CPF ${cpf}, ${regLabel} ${registro}/${registroUf}, Especialidade: ${especialidade || 'Geral'}.</p>
            <p><strong>CLÁUSULA 1 - DO OBJETO:</strong> Prestação de serviços profissionais de saúde via plataforma VivaS, incluindo teleconsultas, acompanhamento preventivo e suporte a pacientes.</p>
            <p><strong>CLÁUSULA 2 - DAS OBRIGAÇÕES:</strong> Manter dados atualizados, prestar atendimento ético, cumprir horários, manter sigilo LGPD.</p>
            <p><strong>CLÁUSULA 3 - DA REMUNERAÇÃO:</strong> Repasse por consulta realizada, conforme tabela vigente, via transferência bancária mensal.</p>
            <p><strong>CLÁUSULA 4 - DA VIGÊNCIA:</strong> 12 meses, renovável automaticamente.</p>
            <p><strong>CLÁUSULA 5 - DA RESCISÃO:</strong> Sem ônus, mediante aviso de 30 dias.</p>
            <p><strong>CLÁUSULA 6 - DO FORO:</strong> Comarca de Belo Horizonte/MG.</p>
            <p style="text-align:center;margin-top:16px;font-style:italic">Assinado eletronicamente em ${contractDate}</p>
          </div>

          <div style="background:#E4F4EC;border-radius:10px;padding:16px;margin:16px 0">
            <p style="font-size:13px;font-weight:600;color:#166534;margin-bottom:4px">&#10004; Assinatura eletrônica válida</p>
            <p style="font-size:12px;color:#6B7280">Contrato assinado digitalmente conforme MP 2.200-2/2001 e Lei 14.063/2020. Representante VivaS: Crossgeo LTDA (CNPJ 56.195.515/0001-49)</p>
          </div>

          <div style="background:var(--wine-soft,#F6E7E1);border-radius:10px;padding:16px;margin:16px 0">
            <p style="font-size:13px;font-weight:600;color:#7B1E3C;margin-bottom:4px">Seus dados de acesso:</p>
            <p style="font-size:13px;color:#6B7280">Email: ${email}</p>
            <p style="font-size:13px;color:#6B7280">Senha temporária: <strong>${tempPassword}</strong></p>
            <p style="font-size:12px;color:#6B7280;margin-top:6px">Acesse <a href="https://vivas.digital/login" style="color:#7B1E3C">vivas.digital</a> e altere sua senha no primeiro acesso.</p>
          </div>

          <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
          <p style="font-size:11px;color:#9CA3AF;text-align:center">VivaS Saúde Inteligente | Crossgeo LTDA - CNPJ 56.195.515/0001-49 | suporte@crossgeo.com.br</p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"VivaS Saúde" <${smtpUser}>`,
        to: email,
        subject: 'VivaS - Contrato assinado e acesso à plataforma',
        html
      });
      console.log(`[ONBOARDING] Contract email sent to ${email} - Response: ${info.response}`);
    } else {
      console.log(`[ONBOARDING] No SMTP_PASS - email would be sent to ${email}`);
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
