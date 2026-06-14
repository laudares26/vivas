const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// GET /api/coupons
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/coupons
router.post('/', async (req, res) => {
  try {
    const { code, campaign, discount, max_redemptions, valid_until, status } = req.body;
    const result = await pool.query(
      `INSERT INTO coupons (code, campaign, discount, max_redemptions, valid_until, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [code, campaign, discount, max_redemptions || null, valid_until || null, status || 'Ativo']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Código já existe' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/coupons/:id
router.put('/:id', async (req, res) => {
  try {
    const { code, campaign, discount, max_redemptions, valid_until, status } = req.body;
    const result = await pool.query(
      `UPDATE coupons SET code = COALESCE($1, code), campaign = COALESCE($2, campaign),
       discount = COALESCE($3, discount), max_redemptions = COALESCE($4, max_redemptions),
       valid_until = COALESCE($5, valid_until), status = COALESCE($6, status), updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [code, campaign, discount, max_redemptions, valid_until, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cupom não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/coupons/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
