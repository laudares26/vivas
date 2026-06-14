const router = require('express').Router();
const pool = require('../config/database');

// GET all patients with search, filter, pagination
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20, active } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM patients';
    let countQuery = 'SELECT COUNT(*) FROM patients';
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR cpf ILIKE $${params.length} OR cns ILIKE $${params.length})`);
    }
    if (active !== undefined) {
      params.push(active === 'true');
      conditions.push(`active = $${params.length}`);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      query += where;
      countQuery += where;
    }

    query += ' ORDER BY full_name ASC';
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// GET single patient
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// POST create patient
router.post('/', async (req, res) => {
  try {
    const { full_name, cpf, cns, birth_date, gender, phone, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, blood_type, allergies, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO patients (full_name, cpf, cns, birth_date, gender, phone, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, blood_type, allergies, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [full_name, cpf, cns, birth_date, gender, phone, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, blood_type, allergies, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'CPF ou CNS já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
});

// PUT update patient
router.put('/:id', async (req, res) => {
  try {
    const { full_name, cpf, cns, birth_date, gender, phone, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, blood_type, allergies, notes, active } = req.body;
    const result = await pool.query(
      `UPDATE patients SET full_name=$1, cpf=$2, cns=$3, birth_date=$4, gender=$5, phone=$6, email=$7, 
       address_street=$8, address_number=$9, address_complement=$10, address_neighborhood=$11, 
       address_city=$12, address_state=$13, address_zip=$14, blood_type=$15, allergies=$16, notes=$17, 
       active=$18, updated_at=NOW() WHERE id=$19 RETURNING *`,
      [full_name, cpf, cns, birth_date, gender, phone, email, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, blood_type, allergies, notes, active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'CPF ou CNS já cadastrado' });
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// DELETE patient
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json({ message: 'Paciente removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover paciente' });
  }
});

module.exports = router;
