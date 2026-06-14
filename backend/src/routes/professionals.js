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

module.exports = router;
