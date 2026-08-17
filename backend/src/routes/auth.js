const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { generatePacienteTerms } = require('../services/contracts');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('WARNING: Using default JWT_SECRET — set JWT_SECRET env var for production');
  return 'vivas-dev-only-secret';
})();

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware for role check
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND active = true', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_color: user.avatar_color },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fetch data isolation relationships
    let relationships = { patients: [], professionals: [] };
    const PROFESSIONAL_ROLES = ['medico', 'psicologo'];
    if (PROFESSIONAL_ROLES.includes(user.role)) {
      const rel = await pool.query(
        `SELECT u.id, u.full_name FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.patient_user_id
         WHERE ppr.professional_user_id = $1 AND u.active = true`, [user.id]
      );
      relationships.patients = rel.rows;
    } else if (user.role === 'paciente') {
      const rel = await pool.query(
        `SELECT u.id, u.full_name, u.role FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.professional_user_id
         WHERE ppr.patient_user_id = $1 AND u.active = true`, [user.id]
      );
      relationships.professionals = rel.rows;
    }

    // Fetch company info for RH users
    let company = null;
    if (user.role === 'rh') {
      const companyResult = await pool.query(
        `SELECT c.* FROM companies c
         JOIN company_employees ce ON ce.company_id = c.id
         WHERE ce.user_id = $1 AND ce.role = 'rh'`, [user.id]
      );
      if (companyResult.rows.length > 0) {
        company = companyResult.rows[0];
      }
    }

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_color: user.avatar_color },
      relationships,
      company
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (public self-registration — requires plan subscription)
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, avatar_color, sessionId, plan } = req.body;

    // Verify Stripe session if provided (plan-gated registration)
    let validPlan = null;
    let maxMembers = 1;
    let stripeCustomerId = null;
    let stripeSubscriptionId = null;
    
    if (sessionId) {
      try {
        const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
        if (stripe) {
          const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
          if (session.payment_status === 'paid') {
            validPlan = session.metadata.plan;
            maxMembers = parseInt(session.metadata.maxMembers) || 1;
            stripeCustomerId = session.customer;
            stripeSubscriptionId = session.subscription?.id || session.subscription;
          }
        } else {
          // Dev mode: accept plan without Stripe verification
          validPlan = plan || 'individual';
          maxMembers = validPlan === 'familia' ? 4 : 1;
        }
      } catch (stripeErr) {
        console.warn('Stripe verification failed:', stripeErr.message);
        // Allow registration in dev mode
        validPlan = plan || 'individual';
        maxMembers = validPlan === 'familia' ? 4 : 1;
      }
    } else {
      // No session: allow registration with plan for dev/testing
      validPlan = plan || 'individual';
      maxMembers = validPlan === 'familia' ? 4 : 1;
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color)
       VALUES ($1, $2, $3, 'paciente', $4) RETURNING id, email, full_name, role, avatar_color`,
      [email, password_hash, full_name, avatar_color || '#7B1E3C']
    );
    const user = result.rows[0];

    // Create subscription record
    if (validPlan) {
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan, status, max_members, stripe_customer_id, stripe_subscription_id, current_period_end)
         VALUES ($1, $2, 'active', $3, $4, $5, $6)`,
        [user.id, validPlan, maxMembers, stripeCustomerId, stripeSubscriptionId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
      );
    }

    // Create patient record (titular)
    await pool.query(
      `INSERT INTO patients (full_name, cpf, birth_date, gender, email, user_id, convenio, status)
       VALUES ($1, $2, NOW(), 'Não informado', $3, $4, 'vivas', 'Ativo')
       ON CONFLICT DO NOTHING`,
      [full_name, 'auto-' + user.id.substring(0, 8), email, user.id]
    );

    // Send patient terms/contract email (non-blocking)
    {
      const { sendRawEmail } = require('../services/notifications');
      const termsHtml = generatePacienteTerms({
        fullName: full_name,
        cpf: null,
        email,
        plan: validPlan || 'individual'
      });
      sendRawEmail({
        to: email,
        subject: 'vivas - Termos e Condicoes de Uso',
        html: termsHtml
      }).then(result => {
        console.log(`[REGISTER] Terms email dispatch to ${email} - success: ${result.success}`);
      }).catch(err => {
        console.error(`[REGISTER] Terms email failed for ${email}:`, err.message);
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_color: user.avatar_color },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({ token, user, subscription: { plan: validPlan, maxMembers } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const VALID_ROLES = ['admin', 'medico', 'psicologo', 'paciente', 'marketing_admin', 'rh'];

// POST /api/auth/users (admin only — create user with any role)
router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, password, full_name, role = 'paciente', avatar_color } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, avatar_color, active, created_at`,
      [email, password_hash, full_name, role, avatar_color || '#0057B8']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, avatar_color, active, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = result.rows[0];

    // Include relationships for data isolation
    let relationships = { patients: [], professionals: [] };
    const PROFESSIONAL_ROLES = ['medico', 'psicologo'];
    if (PROFESSIONAL_ROLES.includes(user.role)) {
      const rel = await pool.query(
        `SELECT u.id, u.full_name FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.patient_user_id
         WHERE ppr.professional_user_id = $1 AND u.active = true`, [user.id]
      );
      relationships.patients = rel.rows;
    } else if (user.role === 'paciente') {
      const rel = await pool.query(
        `SELECT u.id, u.full_name, u.role FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.professional_user_id
         WHERE ppr.patient_user_id = $1 AND u.active = true`, [user.id]
      );
      relationships.professionals = rel.rows;
    }

    res.json({ ...user, relationships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, role, avatar_color, active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id (admin only)
router.put('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { full_name, role, active } = req.body;
    if (role !== undefined && role !== null && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido' });
    }
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), role = COALESCE($2, role), 
       active = COALESCE($3, active), updated_at = NOW() WHERE id = $4 
       RETURNING id, email, full_name, role, avatar_color, active`,
      [full_name, role, active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, authenticate, authorize };
