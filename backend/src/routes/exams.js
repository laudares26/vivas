const router = require('express').Router();
const pool = require('../config/database');
const multer = require('multer');
const {
  checkAndNotify, THRESHOLDS, classifyIndicator,
  getIndicatorHistory, computeComparativeAnalysis, sendComparativeReport,
} = require('../services/notifications');
const groq = require('../services/groq');

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

// Pattern-based indicator extraction from exam text/filename
// In production this would use OCR + NLP; here we use regex patterns
// commonly found in Brazilian lab reports
const INDICATOR_PATTERNS = [
  { name: 'glicemia_jejum', patterns: [/glic[eê]mia[\s\S]{0,30}?(\d{2,3}[.,]?\d*)\s*mg/i, /glicose[\s\S]{0,30}?(\d{2,3}[.,]?\d*)\s*mg/i] },
  { name: 'colesterol_ldl', patterns: [/ldl[\s\S]{0,30}?(\d{2,3}[.,]?\d*)\s*mg/i, /colesterol\s*ldl[\s\S]{0,30}?(\d{2,3}[.,]?\d*)/i] },
  { name: 'pressao_sistolica', patterns: [/press[aã]o[\s\S]{0,20}?(\d{2,3})\s*[x\/]\s*\d{2,3}/i, /sist[oó]lica[\s\S]{0,20}?(\d{2,3})/i] },
  { name: 'pressao_diastolica', patterns: [/press[aã]o[\s\S]{0,20}?\d{2,3}\s*[x\/]\s*(\d{2,3})/i, /diast[oó]lica[\s\S]{0,20}?(\d{2,3})/i] },
  { name: 'hemoglobina_glicada', patterns: [/hemoglobina\s*glicada[\s\S]{0,30}?(\d{1,2}[.,]\d{1,2})\s*%/i, /hba1c[\s\S]{0,20}?(\d{1,2}[.,]\d{1,2})/i] },
  { name: 'triglicerideos', patterns: [/triglic[eé]r[ií]d[eo]s?[\s\S]{0,30}?(\d{2,4}[.,]?\d*)\s*mg/i] },
  { name: 'creatinina', patterns: [/creatinina[\s\S]{0,30}?(\d{1,2}[.,]\d{1,2})\s*mg/i] },
  { name: 'imc', patterns: [/imc[\s\S]{0,20}?(\d{2}[.,]\d{1,2})/i] },
];

function extractIndicatorsFromText(text) {
  const indicators = [];
  for (const def of INDICATOR_PATTERNS) {
    for (const pattern of def.patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(value) && value > 0) {
          indicators.push({ name: def.name, value });
          break;
        }
      }
    }
  }
  return indicators;
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

// Extract raw text from an uploaded exam file (PDF text layer or filename for images).
async function extractTextFromFile(file, fallbackName) {
  const fileBuffer = file.buffer;
  const fileMimeType = file.mimetype;
  let extractedText = '';

  if (fileMimeType === 'application/pdf') {
    try {
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      const uint8 = new Uint8Array(fileBuffer);
      const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map(item => item.str).join(' ') + '\n';
      }
      console.log(`[EXAM UPLOAD] PDF text extracted: ${extractedText.length} chars`);
    } catch (pdfErr) {
      console.warn('[EXAM UPLOAD] pdfjs failed, falling back to raw extraction:', pdfErr.message);
      const bufStr = fileBuffer.toString('utf-8');
      const textMatches = bufStr.match(/\(([^)]+)\)/g);
      if (textMatches) {
        extractedText = textMatches.map(m => m.slice(1, -1)).join(' ');
      }
    }
  } else {
    // For images, include the filename which may contain useful info
    extractedText = fallbackName || file.originalname || '';
  }
  return extractedText;
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
  let extractedText = await extractTextFromFile(file, fileName);
  if (opts.exam_text) extractedText += ' ' + opts.exam_text;

  const indicators = extractIndicatorsFromText(extractedText);

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

  const examResult = await pool.query(
    `INSERT INTO exams (patient_id, exam_name, category, status, result, ai_analysis, result_date, uploaded_by, file_name, file_type, file_size, source, notes)
     VALUES ($1, $2, 'laboratorial', 'concluido', $3, $4, NOW(), $5, $6, $7, $8, 'upload_paciente', $9) RETURNING *`,
    [
      patientId, fileName,
      indicators.length > 0 ? JSON.stringify(indicators) : null,
      aiAnalysis, userId,
      file.originalname, file.mimetype, file.size,
      opts.notes || null
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

  // Store each extracted indicator in the longitudinal history table.
  for (const ind of indicators) {
    const threshold = THRESHOLDS[ind.name];
    await pool.query(
      `INSERT INTO health_indicators (patient_user_id, indicator_name, value, unit, recorded_at, source)
       VALUES ($1, $2, $3, $4, NOW(), 'exam_upload')`,
      [userId, ind.name, ind.value, threshold ? threshold.unit : '']
    );
  }

  return { exam, indicators, aiAnalysis };
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

    let notificationResult = null;
    if (indicators.length > 0) {
      notificationResult = await checkAndNotify(userId, indicators);
      await updateTriageFromIndicators(patientId, userId, indicators, aiAnalysis);
    }

    res.json({
      success: true,
      exam,
      indicators_found: indicators.length,
      indicators,
      ai_analysis: aiAnalysis,
      notifications: notificationResult
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

    // Comparative / historical analysis over the full indicator history.
    const history = await getIndicatorHistory(userId);
    const comparative = computeComparativeAnalysis(history);

    // LLM comparative narrative (optional — falls back silently).
    let comparativeAnalysisText = null;
    if (groq.isConfigured() && comparative.trends.length > 0) {
      try {
        comparativeAnalysisText = await groq.analyzeExamComparison(comparative.trends);
      } catch (llmErr) {
        console.warn('[EXAM BATCH] Groq comparative analysis failed:', llmErr.message);
      }
    }

    // Notify patient + professionals when the comparative analysis found alerts.
    const notifications = await sendComparativeReport(userId, comparative, comparativeAnalysisText);

    res.json({
      success: true,
      files_processed: processed.length,
      exams: processed,
      total_indicators: allIndicators.length,
      comparative: {
        trends: comparative.trends,
        alerts: comparative.alerts,
        analysis: comparativeAnalysisText,
      },
      notifications,
    });
  } catch (err) {
    console.error('[EXAM BATCH] Error:', err);
    res.status(500).json({ error: 'Erro ao processar exames: ' + err.message });
  }
});

// GET /api/exams/comparative — comparative/historical view of the patient's indicators
router.get('/comparative', async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await getIndicatorHistory(userId);
    const comparative = computeComparativeAnalysis(history);
    res.json({
      trends: comparative.trends,
      alerts: comparative.alerts,
      history,
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
