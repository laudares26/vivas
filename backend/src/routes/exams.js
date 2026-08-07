const router = require('express').Router();
const pool = require('../config/database');
const multer = require('multer');
const {
  THRESHOLDS, classifyIndicator,
  getIndicatorHistory, computeComparativeAnalysis, sendComparativeReport,
  buildFallbackComparativeText, detectPriorityPatterns, computeHealthScore,
  buildTrendPreventiveText, maybeSendTeleconsultSuggestion,
} = require('../services/notifications');

const PROFESSIONAL_ROLES = ['medico', 'psicologo'];
const {
  extractIndicatorsFromText, extractCollectionDate, extractCriticalFindings, extractTextFromFile,
} = require('../services/examExtraction');
const groq = require('../services/groq');
const analysisStore = require('../services/preventiveAnalysisStore');

const MAX_BATCH_FILES = 50;

const examUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: MAX_BATCH_FILES },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Wraps a multer middleware so upload errors (too many files, file too large,
// etc.) return a friendly JSON message instead of the default HTML 500 — which
// the frontend cannot parse, making batch uploads appear to "fail silently".
function withUploadErrors(mw) {
  return (req, res, next) => {
    mw(req, res, err => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: `Envie no máximo ${MAX_BATCH_FILES} arquivos por vez.` });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Cada arquivo deve ter no máximo 25MB.' });
        }
        return res.status(400).json({ error: 'Falha no envio dos arquivos: ' + err.message });
      }
      return res.status(400).json({ error: err.message || 'Falha no envio dos arquivos.' });
    });
  };
}

function generateAiAnalysis(indicators) {
  if (indicators.length === 0) {
    return 'Exame recebido com sucesso. Nao foi possivel extrair indicadores automaticamente deste documento. ' +
      'Os dados serao revisados manualmente pelo profissional de saude responsavel.';
  }

  const lines = ['Analise preventiva automatica dos indicadores extraidos:'];
  const alerts = [];
  const normals = [];

  for (const ind of indicators) {
    const threshold = THRESHOLDS[ind.name];
    if (!threshold) continue;
    const status = classifyIndicator(ind.name, ind.value);
    const item = `${threshold.label}: ${ind.value} ${threshold.unit}`;
    if (status === 'alerta') {
      alerts.push(`${item} - ALERTA (acima do limite de ${threshold.atencao[1]} ${threshold.unit})`);
    } else if (status === 'atencao') {
      alerts.push(`${item} - ATENCAO (proximo do limite)`);
    } else {
      normals.push(`${item} - Normal`);
    }
  }

  if (alerts.length > 0) {
    lines.push('');
    lines.push('Indicadores que requerem atencao:');
    alerts.forEach(a => lines.push(`  - ${a}`));
  }
  if (normals.length > 0) {
    lines.push('');
    lines.push('Indicadores dentro da normalidade:');
    normals.forEach(n => lines.push(`  - ${n}`));
  }

  lines.push('');
  lines.push('IMPORTANTE: Esta analise e um suporte preventivo inteligente e nao constitui diagnostico medico. ' +
    'Consulte seu profissional de saude para orientacoes clinicas.');

  return lines.join('\n');
}

let examColumnsEnsured = false;
async function ensureExamColumns() {
  if (examColumnsEnsured) return;
  await pool.query(`
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS file_size INTEGER;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'manual';
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_text TEXT;
  `);
  // Store the original uploaded file so patient and professional can reopen it anytime.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_files (
      exam_id UUID PRIMARY KEY REFERENCES exams(id) ON DELETE CASCADE,
      file_name VARCHAR(255),
      mime_type VARCHAR(100),
      file_size INTEGER,
      data BYTEA NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  examColumnsEnsured = true;
}

// Process a single exam file: extract indicators, generate analysis, persist
// the exam row + health_indicators. Returns { exam, indicators, aiAnalysis }.
async function processExamFile(userId, patientId, file, opts = {}) {
  const fileName = opts.exam_name || file.originalname || 'Exame enviado';
  let extractedText = await extractTextFromFile(file.buffer, file.mimetype, fileName);
  if (opts.exam_text) extractedText += ' ' + opts.exam_text;

  const indicators = extractIndicatorsFromText(extractedText);
  // Record indicators at the exam's real collection date (when present) so the
  // longitudinal trajectory reflects the actual timeline, not the upload time.
  const collectedAt = extractCollectionDate(extractedText);
  const criticalFindings = extractCriticalFindings(extractedText);

  // Prefer the Groq LLM for a richer preventive interpretation; fall back to rules.
  let aiAnalysis = generateAiAnalysis(indicators);
  if (groq.isConfigured()) {
    try {
      const enriched = indicators.map(ind => {
        const t = THRESHOLDS[ind.name];
        return {
          name: ind.name,
          label: t ? t.label : ind.name,
          value: ind.value,
          unit: t ? t.unit : '',
          status: classifyIndicator(ind.name, ind.value),
        };
      });
      aiAnalysis = await groq.analyzeExamIndicators(enriched, extractedText);
    } catch (llmErr) {
      console.warn('[EXAM UPLOAD] Groq analysis failed, using rule-based fallback:', llmErr.message);
    }
  }

  await ensureExamColumns();

  // Keep a bounded copy of the raw exam text so the LLM can later reason over
  // the full content of every exam (generic detection), not just the numeric
  // indicators our regex happened to extract.
  const storedText = (extractedText || '').replace(/\s+/g, ' ').trim().slice(0, 12000) || null;

  const examResult = await pool.query(
    `INSERT INTO exams (patient_id, exam_name, category, status, result, ai_analysis, result_date, uploaded_by, file_name, file_type, file_size, source, notes, exam_text)
     VALUES ($1, $2, 'laboratorial', 'concluido', $3, $4, COALESCE($10, NOW()), $5, $6, $7, $8, 'upload_paciente', $9, $11) RETURNING *`,
    [
      patientId, fileName,
      indicators.length > 0 ? JSON.stringify(indicators) : null,
      aiAnalysis, userId,
      file.originalname, file.mimetype, file.size,
      opts.notes || null,
      collectedAt, storedText
    ]
  );
  const exam = examResult.rows[0];

  // Persist the original file so patient and professional can reopen it anytime.
  if (file.buffer && file.buffer.length > 0) {
    await pool.query(
      `INSERT INTO exam_files (exam_id, file_name, mime_type, file_size, data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (exam_id) DO UPDATE SET file_name = EXCLUDED.file_name, mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size, data = EXCLUDED.data`,
      [exam.id, file.originalname, file.mimetype, file.size, file.buffer]
    );
    exam.has_file = true;
  }

  // Store each extracted indicator in the longitudinal history table, at the
  // exam's real collection date when available.
  for (const ind of indicators) {
    const threshold = THRESHOLDS[ind.name];
    await pool.query(
      `INSERT INTO health_indicators (patient_user_id, indicator_name, value, unit, recorded_at, source)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), 'exam_upload')`,
      [userId, ind.name, ind.value, threshold ? threshold.unit : '', collectedAt]
    );
  }

  return { exam, indicators, aiAnalysis, criticalFindings };
}

// Runs the Groq-powered comparative analysis over the patient's ENTIRE exam
// history (all indicators from every uploaded/seeded exam) and notifies the
// patient + linked professionals when a worsening/out-of-range trend is found.
// Used by both single and batch uploads so alerts always consider all exams.
// Collect critical free-text findings (leukemia/monoclonal/blastos keywords)
// from a patient's stored exams (name + result text + analysis) so the
// comparative analysis can factor in laudos that carry no numeric indicator
// (e.g. immunophenotyping conclusions).
async function getCriticalFindingsForUser(userId) {
  try {
    const { rows } = await pool.query(
      `SELECT e.exam_name, e.ai_analysis, e.notes
       FROM exams e
       JOIN patients p ON p.id = e.patient_id
       JOIN users u ON u.email = p.email
       WHERE u.id = $1
       ORDER BY e.created_at DESC LIMIT 200`,
      [userId]
    );
    const text = rows.map(r => `${r.exam_name || ''} ${r.ai_analysis || ''} ${r.notes || ''}`).join(' \n ');
    return extractCriticalFindings(text);
  } catch (err) {
    console.warn('[EXAM] getCriticalFindingsForUser failed:', err.message);
    return [];
  }
}

// Load the bounded raw text of every exam of a patient so the LLM can reason
// over the full content (generic detection), not only the extracted indicators.
async function getExamTextsForUser(userId) {
  try {
    await ensureExamColumns();
    const { rows } = await pool.query(
      `SELECT COALESCE(e.result_date, e.created_at) AS date, e.exam_name, e.exam_text
       FROM exams e
       JOIN patients p ON p.id = e.patient_id
       JOIN users u ON u.email = p.email
       WHERE u.id = $1 AND e.exam_text IS NOT NULL AND length(trim(e.exam_text)) > 0
       ORDER BY COALESCE(e.result_date, e.created_at) ASC
       LIMIT 400`,
      [userId]
    );
    return rows;
  } catch (err) {
    console.warn('[EXAM] getExamTextsForUser failed:', err.message);
    return [];
  }
}

// Build the preventive narrative. GENERIC-FIRST: feed the full exam text to the
// LLM so it detects any risk pattern on its own (no per-disease code). Falls
// back to the structured comparison, then to the deterministic text, so the
// panel/alert is never left empty when Groq is unavailable.
// Returns { text, provider, model }. `provider` is the LLM that actually served
// the narrative ("medgemma" / "groq"), or "fallback" when the deterministic text
// was used because no LLM was available.
async function buildComparativeNarrative(userId, trends, history, criticalFindings, trendDecision = null) {
  if (!trends || trends.length === 0) return null;

  // Deterministic safety net: high-priority patterns (hematologic / plasma-cell)
  // that emerge only from crossing several exams over time are computed from the
  // numeric trends and ALWAYS surfaced. The generic LLM narrative is great for
  // breadth but non-deterministic, so it can miss a slow oncologic trajectory
  // even when the markers are present. We prepend any priority pattern the LLM
  // did not already cover so a myeloma/leukemia signal is never dropped.
  const priority = detectPriorityPatterns(trends, criticalFindings);

  // Preventive decision layer (motor de tendência): a sustained + concordant
  // in-range drift is a deterministic signal that must be surfaced even when no
  // value is out of range. Treat it like a priority pattern so it is injected
  // into the narrative if the LLM did not cover it on its own.
  const trendText = buildTrendPreventiveText(trendDecision);
  if (trendText) {
    priority.unshift({ key: 'trend_decision', term: 'tendência sustentada', text: trendText });
  }

  let llmText = null;
  if (groq.isConfigured()) {
    const examTexts = await getExamTextsForUser(userId);
    if (examTexts.length > 0) {
      try {
        llmText = await groq.analyzeRawExamHistory(examTexts, { trends, criticalFindings, priorityPatterns: priority });
      } catch (llmErr) {
        console.warn('[EXAM] Groq raw-text analysis failed, trying structured:', llmErr.message);
      }
    }
    if (!llmText) {
      try {
        llmText = await groq.analyzeExamComparison(trends, { history, criticalFindings, priorityPatterns: priority });
      } catch (llmErr) {
        console.warn('[EXAM] Groq structured analysis failed:', llmErr.message);
      }
    }
  }

  if (!llmText) {
    return { text: buildFallbackComparativeText(trends, criticalFindings, trendDecision), provider: 'fallback', model: null };
  }

  const provider = groq.getLastProvider();
  const model = groq.getLastModel();

  const missing = priority.filter(p => !llmText.toLowerCase().includes(p.term.toLowerCase()));
  if (missing.length === 0) return { text: llmText, provider, model };

  const header = 'Sinais prioritários detectados na sua trajetória de exames (requerem atenção):';
  const text = `${header}\n\n${missing.map(p => `- ${p.text}`).join('\n\n')}\n\n---\n\n${llmText}`;
  return { text, provider, model };
}

async function analyzeHistoryAndNotify(userId) {
  const history = await getIndicatorHistory(userId);
  const comparative = computeComparativeAnalysis(history);
  const criticalFindings = await getCriticalFindingsForUser(userId);

  const narrative = await buildComparativeNarrative(userId, comparative.trends, history, criticalFindings, comparative.trendDecision);
  const comparativeAnalysisText = narrative ? narrative.text : null;

  if (narrative && comparative.trends.length > 0) {
    const score = computeHealthScore(comparative.trends, criticalFindings, comparative.trendDecision);
    await analysisStore.saveAnalysis(userId, {
      text: narrative.text, score, provider: narrative.provider,
      model: narrative.model, trendsCount: comparative.trends.length,
    }).catch(err => console.warn('[EXAM] saveAnalysis failed:', err.message));
  }

  const notifications = await sendComparativeReport(userId, comparative, comparativeAnalysisText);
  return { comparative, comparativeAnalysisText, notifications };
}

// Generate + persist the intelligent analysis for one patient WITHOUT notifying.
// Used by the scheduled MedGemma batch job (LLM_PROVIDER=vertex) so the deep
// analysis is stored and later served instantly, off the request path.
async function runPreventiveAnalysis(userId) {
  const history = await getIndicatorHistory(userId);
  const comparative = computeComparativeAnalysis(history);
  if (comparative.trends.length === 0) return { userId, skipped: 'no-trends' };

  const criticalFindings = await getCriticalFindingsForUser(userId);
  const narrative = await buildComparativeNarrative(userId, comparative.trends, history, criticalFindings, comparative.trendDecision);
  if (!narrative) return { userId, skipped: 'no-narrative' };

  const score = computeHealthScore(comparative.trends, criticalFindings, comparative.trendDecision);
  const saved = await analysisStore.saveAnalysis(userId, {
    text: narrative.text, score, provider: narrative.provider,
    model: narrative.model, trendsCount: comparative.trends.length,
  });
  return { userId, provider: narrative.provider, model: narrative.model, score, savedId: saved && saved.id };
}

// Create/update a Manchester triage entry when indicators are in alert (non-blocking).
async function updateTriageFromIndicators(patientId, userId, indicators, aiAnalysis) {
  try {
    const hasAlerts = indicators.some(ind => classifyIndicator(ind.name, ind.value) === 'alerta');
    if (!hasAlerts) return;
    const alertIndicators = indicators.filter(ind => classifyIndicator(ind.name, ind.value) !== 'normal');
    const triageColor = 'amarelo';
    const symptomsSummary = alertIndicators.map(ind => {
      const t = THRESHOLDS[ind.name];
      return `${t ? t.label : ind.name}: ${ind.value} ${t ? t.unit : ''}`;
    }).join('; ');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS triage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID,
        manchester_color VARCHAR(20),
        symptoms TEXT,
        ai_assessment TEXT,
        priority_score INTEGER DEFAULT 5,
        status VARCHAR(30) DEFAULT 'aguardando',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const existingTriage = await pool.query(
      `SELECT id FROM triage WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [patientId || userId]
    );

    if (existingTriage.rows.length > 0) {
      await pool.query(
        `UPDATE triage SET manchester_color = $1, symptoms = $2, ai_assessment = $3, status = 'em_analise', updated_at = NOW() WHERE id = $4`,
        [triageColor, symptomsSummary, aiAnalysis, existingTriage.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO triage (patient_id, manchester_color, symptoms, ai_assessment, priority_score, status)
         VALUES ($1, $2, $3, $4, $5, 'aguardando')`,
        [patientId || userId, triageColor, symptomsSummary, aiAnalysis, 7]
      );
    }
  } catch (triageErr) {
    console.warn('[EXAM UPLOAD] Triage update failed (non-blocking):', triageErr.message);
  }
}

// POST /api/exams/upload — patient uploads a single exam file for AI analysis
router.post('/upload', withUploadErrors(examUpload.single('file')), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo e obrigatorio' });
    }

    const userId = req.user.id;
    const patientResult = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [userId]
    );
    const patientId = patientResult.rows.length > 0 ? patientResult.rows[0].id : null;

    const { exam, indicators, aiAnalysis } = await processExamFile(userId, patientId, req.file, req.body);

    if (indicators.length > 0) {
      await updateTriageFromIndicators(patientId, userId, indicators, aiAnalysis);
    }

    // Alert analysis integrates the patient's ENTIRE exam history (all exams),
    // not just this single upload.
    const { comparative, comparativeAnalysisText, notifications } = await analyzeHistoryAndNotify(userId);

    res.json({
      success: true,
      exam,
      indicators_found: indicators.length,
      indicators,
      ai_analysis: aiAnalysis,
      comparative: {
        trends: comparative.trends,
        alerts: comparative.alerts,
        analysis: comparativeAnalysisText,
      },
      notifications
    });
  } catch (err) {
    console.error('[EXAM UPLOAD] Error:', err);
    res.status(500).json({ error: 'Erro ao processar exame: ' + err.message });
  }
});

// POST /api/exams/upload-batch — patient uploads MANY exams at once; the system
// analyses each, then runs a comparative/historical analysis across the patient's
// full indicator history and notifies patient + professionals when trends worsen.
router.post('/upload-batch', withUploadErrors(examUpload.array('files', MAX_BATCH_FILES)), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Envie ao menos um arquivo' });
    }

    const userId = req.user.id;
    const patientResult = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [userId]
    );
    const patientId = patientResult.rows.length > 0 ? patientResult.rows[0].id : null;

    // Process files with limited concurrency so large batches don't run each
    // (slow) LLM analysis strictly one-after-another and blow past the request
    // timeout. Results are kept in the original upload order.
    const CONCURRENCY = 4;
    const processed = new Array(req.files.length);
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= req.files.length) break;
        const file = req.files[idx];
        try {
          const result = await processExamFile(userId, patientId, file, {
            notes: req.body.notes || null,
          });
          processed[idx] = {
            exam: result.exam,
            file_name: file.originalname,
            indicators_found: result.indicators.length,
            indicators: result.indicators,
            ai_analysis: result.aiAnalysis,
          };
        } catch (fileErr) {
          console.error(`[EXAM BATCH] Failed to process ${file.originalname}:`, fileErr.message);
          processed[idx] = { file_name: file.originalname, error: fileErr.message };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, req.files.length) }, worker));

    const allIndicators = [];
    for (const p of processed) {
      if (p && p.indicators) allIndicators.push(...p.indicators);
    }

    // Update triage from the combined set of indicators found across all files.
    if (allIndicators.length > 0) {
      const combinedAnalysis = processed
        .filter(p => p.ai_analysis)
        .map(p => `${p.file_name}: ${p.ai_analysis}`)
        .join('\n\n');
      await updateTriageFromIndicators(patientId, userId, allIndicators, combinedAnalysis);
    }

    // Comparative / historical analysis over the patient's ENTIRE exam history
    // (all exams), with Groq narrative + notification when trends worsen.
    const { comparative, comparativeAnalysisText, notifications } = await analyzeHistoryAndNotify(userId);

    res.json({
      success: true,
      files_processed: processed.length,
      exams: processed,
      total_indicators: allIndicators.length,
      comparative: {
        trends: comparative.trends,
        alerts: comparative.alerts,
        analysis: comparativeAnalysisText,
        trend_decision: comparative.trendDecision || null,
      },
      notifications,
    });
  } catch (err) {
    console.error('[EXAM BATCH] Error:', err);
    res.status(500).json({ error: 'Erro ao processar exames: ' + err.message });
  }
});

// Resolves whose indicator history the current user may read: patients read
// their own; a professional (or admin) may read a linked patient's history when
// a patientId (patients.id) is provided. Returns the target user id or null.
async function resolveHistoryUserId(req, patientId) {
  if (!patientId) return req.user.id;
  if (req.user.role === 'paciente') return req.user.id;

  const params = [patientId];
  let accessSql = '';
  if (['medico', 'psicologo'].includes(req.user.role)) {
    params.push(req.user.id);
    accessSql = `AND u.email IN (
      SELECT u2.email FROM users u2
      JOIN professional_patient_relationships ppr ON ppr.patient_user_id = u2.id
      WHERE ppr.professional_user_id = $2
    )`;
  } else if (req.user.role !== 'admin') {
    return null;
  }
  const { rows } = await pool.query(
    `SELECT u.id FROM patients p JOIN users u ON u.email = p.email
     WHERE p.id = $1 ${accessSql} LIMIT 1`,
    params
  );
  return rows.length ? rows[0].id : null;
}

// GET /api/exams/comparative — comparative/historical view over the patient's
// ENTIRE exam history. Pass ?analyze=1 to also get the Groq narrative, and
// ?patientId=<id> so a linked professional can view a specific patient.
router.get('/comparative', async (req, res) => {
  try {
    const userId = await resolveHistoryUserId(req, req.query.patientId);
    if (!userId) return res.status(403).json({ error: 'Sem acesso ao histórico deste paciente' });

    const history = await getIndicatorHistory(userId);
    const comparative = computeComparativeAnalysis(history);
    const criticalFindings = comparative.trends.length > 0
      ? await getCriticalFindingsForUser(userId)
      : [];
    const score = comparative.trends.length > 0
      ? computeHealthScore(comparative.trends, criticalFindings, comparative.trendDecision)
      : null;

    // Prefer the persisted "análise histórica inteligente" (e.g. the scheduled
    // MedGemma batch result) so the request path never waits on a GPU. Generate
    // live (Groq) only when nothing is stored yet, or when refresh=1 is asked.
    let analysis = null;
    let analysisMeta = null;
    if (req.query.analyze === '1' && comparative.trends.length > 0) {
      const stored = await analysisStore.getLatestAnalysis(userId).catch(() => null);
      const forceRefresh = req.query.refresh === '1';
      // Serve a stored analysis only when it is a genuine LLM interpretation.
      // Legacy/stale deterministic rows (provider 'fallback') are ignored so the
      // narrative is regenerated live and stays consistent with the trend banner.
      const storedIsLLM = stored && stored.provider && stored.provider !== 'fallback';
      if (storedIsLLM && !forceRefresh) {
        analysis = stored.analysis_text;
        analysisMeta = { provider: stored.provider, model: stored.model, generated_at: stored.created_at, mode: 'stored' };
      } else {
        const narrative = await buildComparativeNarrative(userId, comparative.trends, history, criticalFindings, comparative.trendDecision);
        if (narrative) {
          analysis = narrative.text;
          analysisMeta = { provider: narrative.provider, model: narrative.model, generated_at: new Date().toISOString(), mode: 'live' };
          await analysisStore.saveAnalysis(userId, {
            text: narrative.text, score, provider: narrative.provider,
            model: narrative.model, trendsCount: comparative.trends.length,
          }).catch(err => console.warn('[EXAM COMPARATIVE] saveAnalysis failed:', err.message));
        }
      }
    }

    // When a linked professional views a patient whose preventive trend fires,
    // suggest a teleconsult: persist a professional-facing alert and email them
    // once (idempotent per axis/level, so reloads never resend).
    let teleconsultSuggested = false;
    const trendFires = comparative.trendDecision && comparative.trendDecision.level !== 'verde';
    if (trendFires && PROFESSIONAL_ROLES.includes(req.user.role) && userId !== req.user.id) {
      teleconsultSuggested = true;
      maybeSendTeleconsultSuggestion(userId, comparative.trendDecision)
        .catch(err => console.warn('[EXAM COMPARATIVE] teleconsult suggestion failed:', err.message));
    }

    res.json({
      trends: comparative.trends,
      alerts: comparative.alerts,
      history,
      analysis,
      analysis_meta: analysisMeta,
      score,
      trend_decision: comparative.trendDecision || null,
      teleconsult_suggested: teleconsultSuggested,
    });
  } catch (err) {
    console.error('[EXAM COMPARATIVE] Error:', err);
    res.status(500).json({ error: 'Erro ao gerar análise comparativa' });
  }
});

// Returns the SQL condition (and pushes params) restricting exam access to the
// current user: patients see their own, professionals see their linked patients'.
function examAccessCondition(req, params) {
  if (req.user.role === 'admin') return null;
  if (['medico', 'psicologo'].includes(req.user.role)) {
    params.push(req.user.id);
    return `e.patient_id IN (SELECT p2.id FROM patients p2 WHERE p2.email IN (SELECT u.email FROM users u JOIN professional_patient_relationships ppr ON ppr.patient_user_id = u.id WHERE ppr.professional_user_id = $${params.length}))`;
  }
  if (req.user.role === 'paciente') {
    params.push(req.user.email);
    return `e.patient_id IN (SELECT id FROM patients WHERE email = $${params.length})`;
  }
  // Other roles: no access to exam files.
  return 'FALSE';
}

// GET /api/exams/:id/file — download the original uploaded exam file. Access is
// restricted to the exam's patient, their linked professionals, and admins.
router.get('/:id/file', async (req, res) => {
  try {
    await ensureExamColumns();
    const params = [req.params.id];
    let query = `SELECT ef.file_name, ef.mime_type, ef.data
                 FROM exam_files ef JOIN exams e ON e.id = ef.exam_id
                 WHERE ef.exam_id = $1`;
    const cond = examAccessCondition(req, params);
    if (cond) query += ` AND ${cond}`;
    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Arquivo do exame não encontrado' });
    }
    const f = result.rows[0];
    res.setHeader('Content-Type', f.mime_type || 'application/octet-stream');
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(f.file_name || 'exame')}"`);
    res.send(f.data);
  } catch (err) {
    console.error('[EXAM FILE] Error:', err);
    res.status(500).json({ error: 'Erro ao buscar arquivo do exame' });
  }
});

router.get('/', async (req, res) => {
  try {
    await ensureExamColumns();
    const { patient_id, status } = req.query;
    let query = `SELECT e.*, p.full_name as patient_name, pr.full_name as professional_name,
                 EXISTS(SELECT 1 FROM exam_files ef WHERE ef.exam_id = e.id) AS has_file
                 FROM exams e
                 LEFT JOIN patients p ON e.patient_id = p.id
                 LEFT JOIN professionals pr ON e.professional_id = pr.id`;
    const params = [];
    const conditions = [];

    // Data isolation: professional sees only exams of their linked patients; patient only their own
    if (['medico', 'psicologo'].includes(req.user.role)) {
      params.push(req.user.id);
      conditions.push(`e.patient_id IN (SELECT p2.id FROM patients p2 WHERE p2.email IN (SELECT u.email FROM users u JOIN professional_patient_relationships ppr ON ppr.patient_user_id = u.id WHERE ppr.professional_user_id = $${params.length}))`);
    } else if (req.user.role === 'paciente') {
      params.push(req.user.email);
      conditions.push(`e.patient_id IN (SELECT id FROM patients WHERE email = $${params.length})`);
    }

    if (patient_id) { params.push(patient_id); conditions.push(`e.patient_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`e.status = $${params.length}`); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY e.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar exames' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { patient_id, professional_id, medical_record_id, loinc_code, exam_name, category, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO exams (patient_id, professional_id, medical_record_id, loinc_code, exam_name, category, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [patient_id, professional_id, medical_record_id, loinc_code, exam_name, category, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao solicitar exame' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, result: examResult, ai_analysis } = req.body;
    const result = await pool.query(
      `UPDATE exams SET status=$1, result=$2, ai_analysis=$3, result_date=CASE WHEN $1='concluido' THEN NOW() ELSE result_date END, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [status, examResult, ai_analysis, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exame não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar exame' });
  }
});

module.exports = router;
// Reusable orchestration for the scheduled MedGemma batch job (scripts/runMedgemmaBatch.js).
module.exports.runPreventiveAnalysis = runPreventiveAnalysis;
