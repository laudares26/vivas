// Persistence for the "análise histórica inteligente" (preventive analysis).
//
// The intelligent analysis is decoupled from when it is generated: a scheduled
// MedGemma (Vertex) batch job writes the deep analysis here, and the app reads
// the stored result instantly — no GPU call on the request path. When no stored
// analysis exists yet, the routes fall back to generating one live with Groq.

const pool = require('../config/database');

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS preventive_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_user_id UUID NOT NULL,
      analysis_text TEXT,
      health_score INTEGER,
      provider VARCHAR(20),
      model VARCHAR(120),
      trends_count INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_prev_analyses_user
      ON preventive_analyses (patient_user_id, created_at DESC);
  `);
  ensured = true;
}

async function saveAnalysis(userId, { text, score, provider, model, trendsCount }) {
  if (!userId || !text) return null;
  await ensureTable();
  // computeHealthScore() returns { score, label, ... }; accept either the object
  // or a bare number so callers don't have to unwrap it.
  const numericScore = (score && typeof score === 'object') ? score.score : score;
  const { rows } = await pool.query(
    `INSERT INTO preventive_analyses
       (patient_user_id, analysis_text, health_score, provider, model, trends_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [userId, text, numericScore != null ? numericScore : null, provider || null, model || null,
      trendsCount != null ? trendsCount : null]
  );
  return rows[0];
}

async function getLatestAnalysis(userId) {
  if (!userId) return null;
  await ensureTable();
  const { rows } = await pool.query(
    `SELECT analysis_text, health_score, provider, model, trends_count, created_at
     FROM preventive_analyses
     WHERE patient_user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows.length ? rows[0] : null;
}

module.exports = { ensureTable, saveAnalysis, getLatestAnalysis };
