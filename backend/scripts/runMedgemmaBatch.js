// Scheduled MedGemma (Vertex AI) batch job for the "análise histórica inteligente".
//
// WHY: MedGemma is an open medical model that runs on a GPU endpoint. Keeping a
// GPU endpoint online 24/7 is expensive, so instead of calling it on the request
// path we run it periodically in batch: this job generates the deep preventive
// analysis for every patient with exams and persists it (preventive_analyses).
// The app then serves the stored result instantly; Groq stays as the interactive
// / fallback provider. Deploy the endpoint, run this job, then undeploy to stop
// paying for the GPU (on-demand model).
//
// Usage:
//   LLM_PROVIDER=vertex node scripts/runMedgemmaBatch.js            # all patients
//   LLM_PROVIDER=vertex node scripts/runMedgemmaBatch.js user@email # one patient
//
// Requires the Vertex env vars (VERTEX_PROJECT_ID, VERTEX_LOCATION,
// VERTEX_MEDGEMMA_ENDPOINT_ID, GOOGLE_VERTEX_SA_KEY). Falls back to Groq per
// patient if Vertex is not configured for that run.

require('dotenv').config();
const pool = require('../src/config/database');
const groq = require('../src/services/groq');
const analysisStore = require('../src/services/preventiveAnalysisStore');
const { runPreventiveAnalysis } = require('../src/routes/exams');

async function targetUsers(emailFilter) {
  if (emailFilter) {
    const { rows } = await pool.query(
      `SELECT id, email FROM users WHERE lower(email) = lower($1)`, [emailFilter]);
    return rows;
  }
  // Every user that has at least one exam (patients matched by email).
  const { rows } = await pool.query(
    `SELECT DISTINCT u.id, u.email
     FROM exams e
     JOIN patients p ON p.id = e.patient_id
     JOIN users u ON u.email = p.email
     ORDER BY u.email`);
  return rows;
}

async function main() {
  const emailFilter = process.argv[2] || null;

  const provider = groq.preferVertex() ? 'vertex/medgemma' : 'groq';
  console.log(`[BATCH] LLM provider preference: ${provider}`);
  if (groq.preferVertex()) {
    // Surface config problems early instead of silently falling back per patient.
    const vertex = require('../src/services/vertexMedgemma');
    console.log(`[BATCH] Vertex configured: ${vertex.isConfigured()}`);
  }

  await analysisStore.ensureTable();

  const users = await targetUsers(emailFilter);
  console.log(`[BATCH] ${users.length} patient(s) to analyze${emailFilter ? ` (filter: ${emailFilter})` : ''}`);

  let ok = 0, skipped = 0, failed = 0;
  for (const u of users) {
    try {
      const res = await runPreventiveAnalysis(u.id);
      if (res.skipped) {
        skipped++;
        console.log(`[BATCH] - ${u.email}: skipped (${res.skipped})`);
      } else {
        ok++;
        console.log(`[BATCH] - ${u.email}: provider=${res.provider} model=${res.model || '-'} score=${res.score} id=${res.savedId}`);
      }
    } catch (err) {
      failed++;
      console.error(`[BATCH] - ${u.email}: FAILED ${err.message}`);
    }
  }

  console.log(`[BATCH] done. ok=${ok} skipped=${skipped} failed=${failed}`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[BATCH] fatal:', err);
  process.exit(1);
});
