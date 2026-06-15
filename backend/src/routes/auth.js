const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

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
    const PROFESSIONAL_ROLES = ['medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'];
    if (PROFESSIONAL_ROLES.includes(user.role)) {
      const rel = await pool.query(
        `SELECT u.id, u.full_name, u.email FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.patient_user_id
         WHERE ppr.professional_user_id = $1 AND u.active = true`, [user.id]
      );
      relationships.patients = rel.rows;
    } else if (user.role === 'paciente') {
      const rel = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.role FROM professional_patient_relationships ppr
         JOIN users u ON u.id = ppr.professional_user_id
         WHERE ppr.patient_user_id = $1 AND u.active = true`, [user.id]
      );
      relationships.professionals = rel.rows;
    }

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_color: user.avatar_color },
      relationships
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (public self-registration — always forces role 'paciente')
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, avatar_color } = req.body;
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color)
       VALUES ($1, $2, $3, 'paciente', $4) RETURNING id, email, full_name, role, avatar_color`,
      [email, password_hash, full_name, avatar_color || '#0057B8']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name, avatar_color: user.avatar_color },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const VALID_ROLES = ['admin', 'medico', 'enfermeiro', 'psicologo', 'fisioterapeuta', 'paciente', 'marketing_admin'];

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
    res.json(result.rows[0]);
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
