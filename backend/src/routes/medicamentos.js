const router = require('express').Router();
const pool = require('../config/database');

// GET /api/medicamentos/anvisa?q=... — search ANVISA registered medications
// Used by the prescription form so professionals get medication data from ANVISA.
router.get('/anvisa', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const like = `%${q}%`;
    const prefix = `${q}%`;
    const result = await pool.query(
      `SELECT nome_produto, principio_ativo, classe_terapeutica, categoria_regulatoria,
              numero_registro, empresa_detentora, situacao_registro
       FROM medicamentos_anvisa
       WHERE nome_produto ILIKE $1 OR principio_ativo ILIKE $1
       ORDER BY (situacao_registro = 'Ativo') DESC,
                (nome_produto ILIKE $2) DESC,
                length(nome_produto) ASC,
                nome_produto ASC
       LIMIT 15`,
      [like, prefix]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[MEDICAMENTOS ANVISA] Error:', err);
    res.status(500).json({ error: 'Erro ao consultar medicamentos da ANVISA' });
  }
});

module.exports = router;
