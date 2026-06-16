const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('./auth');
const bcrypt = require('bcryptjs');

// POST /api/companies/lead - Public endpoint for B2B lead form
router.post('/lead', async (req, res) => {
  try {
    const { name, company, employees, email, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }
    await pool.query(
      'INSERT INTO company_leads (name, company, employees, email, phone) VALUES ($1, $2, $3, $4, $5)',
      [name, company, employees, email, phone]
    );

    // Send notification email to admin
    try {
      const { sendEmail } = require('../services/notifications');
      await sendEmail(
        process.env.SMTP_USER || 'sandrolaudares@gmail.com',
        'VivaS Empresas - Novo lead B2B',
        `<div style="font-family:Arial,sans-serif;max-width:600px;">
          <h2 style="color:#7B1E3C;">Novo Lead B2B - VivaS Empresas</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Nome</td><td style="padding:8px;border-bottom:1px solid #eee;">${name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Empresa</td><td style="padding:8px;border-bottom:1px solid #eee;">${company || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Colaboradores</td><td style="padding:8px;border-bottom:1px solid #eee;">${employees || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${email}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">Telefone</td><td style="padding:8px;border-bottom:1px solid #eee;">${phone || '-'}</td></tr>
          </table>
        </div>`
      );
    } catch (emailErr) {
      console.log('Lead email notification failed:', emailErr.message);
    }

    res.json({ success: true, message: 'Proposta enviada com sucesso' });
  } catch (err) {
    console.error('Lead creation error:', err);
    res.status(500).json({ error: 'Erro ao enviar proposta' });
  }
});

// GET /api/companies - List companies (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
});

// GET /api/companies/mine - Get RH user's company data
router.get('/mine', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'rh') {
      return res.status(403).json({ error: 'Acesso restrito ao RH' });
    }
    // Find company through company_employees
    const companyResult = await pool.query(
      `SELECT c.* FROM companies c
       JOIN company_employees ce ON ce.company_id = c.id
       WHERE ce.user_id = $1 AND ce.role = 'rh'`,
      [req.user.id]
    );
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }
    res.json(companyResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar empresa' });
  }
});

// GET /api/companies/employees - List employees of RH's company
router.get('/employees', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'rh' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    let companyId;
    if (req.user.role === 'rh') {
      const companyResult = await pool.query(
        `SELECT company_id FROM company_employees WHERE user_id = $1 AND role = 'rh'`,
        [req.user.id]
      );
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      companyId = companyResult.rows[0].company_id;
    } else {
      companyId = req.query.company_id;
      if (!companyId) {
        return res.status(400).json({ error: 'company_id obrigatório para admin' });
      }
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.active, u.created_at,
              ce.department, ce.job_title, ce.role as company_role
       FROM users u
       JOIN company_employees ce ON ce.user_id = u.id
       WHERE ce.company_id = $1
       ORDER BY u.full_name`,
      [companyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar colaboradores' });
  }
});

// POST /api/companies/employees - RH adds an employee/patient to their company
router.post('/employees', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'rh' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { full_name, email, department, job_title } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    // Get RH's company
    let companyId;
    if (req.user.role === 'rh') {
      const companyResult = await pool.query(
        `SELECT company_id FROM company_employees WHERE user_id = $1 AND role = 'rh'`,
        [req.user.id]
      );
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      companyId = companyResult.rows[0].company_id;
    } else {
      companyId = req.body.company_id;
    }

    // Check if user already exists
    let userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].id;
    } else {
      // Create new user as paciente with default password
      const defaultPassword = 'vivas2026';
      const password_hash = await bcrypt.hash(defaultPassword, 10);
      const newUser = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, company_id)
         VALUES ($1, $2, $3, 'paciente', $4) RETURNING id`,
        [email, password_hash, full_name, companyId]
      );
      userId = newUser.rows[0].id;
    }

    // Link to company
    await pool.query(
      `INSERT INTO company_employees (company_id, user_id, role, department, job_title)
       VALUES ($1, $2, 'employee', $3, $4)
       ON CONFLICT (company_id, user_id) DO UPDATE SET department = $3, job_title = $4`,
      [companyId, userId, department, job_title]
    );

    // Send welcome email to employee
    try {
      const { sendEmail } = require('../services/notifications');
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [companyId]);
      const companyName = companyResult.rows[0]?.name || 'sua empresa';
      await sendEmail(
        email,
        'VivaS - Bem-vindo ao plano empresarial',
        `<div style="font-family:Arial,sans-serif;max-width:600px;">
          <h2 style="color:#7B1E3C;">Bem-vindo ao VivaS!</h2>
          <p>Olá ${full_name},</p>
          <p>${companyName} cadastrou você no plano VivaS Empresas. Agora você tem acesso completo à plataforma de saúde preventiva.</p>
          <p><strong>Acesse:</strong> <a href="https://vivas.digital/login" style="color:#7B1E3C;">https://vivas.digital/login</a></p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Senha inicial:</strong> vivas2026</p>
          <p style="color:#999;font-size:0.9rem;">Recomendamos alterar sua senha no primeiro acesso.</p>
        </div>`
      );
    } catch (emailErr) {
      console.log('Employee welcome email failed:', emailErr.message);
    }

    res.json({ success: true, message: 'Colaborador cadastrado com sucesso', user_id: userId });
  } catch (err) {
    console.error('Add employee error:', err);
    res.status(500).json({ error: 'Erro ao cadastrar colaborador' });
  }
});

// DELETE /api/companies/employees/:userId - RH removes an employee
router.delete('/employees/:userId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'rh' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    let companyId;
    if (req.user.role === 'rh') {
      const companyResult = await pool.query(
        `SELECT company_id FROM company_employees WHERE user_id = $1 AND role = 'rh'`,
        [req.user.id]
      );
      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      companyId = companyResult.rows[0].company_id;
    }

    // Remove from company_employees
    const deleteQuery = req.user.role === 'rh'
      ? 'DELETE FROM company_employees WHERE user_id = $1 AND company_id = $2 AND role != \'rh\''
      : 'DELETE FROM company_employees WHERE user_id = $1';
    const params = req.user.role === 'rh' ? [req.params.userId, companyId] : [req.params.userId];

    await pool.query(deleteQuery, params);
    res.json({ success: true, message: 'Colaborador removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover colaborador' });
  }
});

// POST /api/companies - Admin creates a company
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    const { name, cnpj, trade_name, sector, employee_count, contact_email, contact_phone, address_city, address_state } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }
    const result = await pool.query(
      `INSERT INTO companies (name, cnpj, trade_name, sector, employee_count, contact_email, contact_phone, address_city, address_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, cnpj, trade_name, sector, employee_count, contact_email, contact_phone, address_city, address_state]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Company creation error:', err);
    res.status(500).json({ error: 'Erro ao criar empresa' });
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'rh') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    // RH can only update their own company
    if (req.user.role === 'rh') {
      const check = await pool.query(
        `SELECT company_id FROM company_employees WHERE user_id = $1 AND role = 'rh'`,
        [req.user.id]
      );
      if (check.rows.length === 0 || check.rows[0].company_id !== req.params.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }
    const { name, cnpj, trade_name, sector, employee_count, contact_email, contact_phone, address_city, address_state } = req.body;
    const result = await pool.query(
      `UPDATE companies SET name=$1, cnpj=$2, trade_name=$3, sector=$4, employee_count=$5,
       contact_email=$6, contact_phone=$7, address_city=$8, address_state=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, cnpj, trade_name, sector, employee_count, contact_email, contact_phone, address_city, address_state, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
});

module.exports = router;
