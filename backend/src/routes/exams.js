const router = require('express').Router();
const pool = require('../config/database');
const multer = require('multer');
const { checkAndNotify, THRESHOLDS, classifyIndicator } = require('../services/notifications');

const examUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

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
  lines.push('IMPORTANTE: Esta analise e um suporte preventivo baseado em IA e nao constitui diagnostico medico. ' +
    'Consulte seu profissional de saude para orientacoes clinicas.');

  return lines.join('\n');
}

// POST /api/exams/upload — patient uploads exam file for AI analysis
router.post('/upload', examUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo e obrigatorio' });
    }

    const userId = req.user.id;
    const fileName = req.body.exam_name || req.file.originalname || 'Exame enviado';
    const fileBuffer = req.file.buffer;
    const fileMimeType = req.file.mimetype;

    // Get patient record for this user
    const patientResult = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1 LIMIT 1', [userId]
    );
    const patientId = patientResult.rows.length > 0 ? patientResult.rows[0].id : null;

    // Try to extract text from the file for analysis
    let extractedText = '';

    if (fileMimeType === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text || '';
        console.log(`[EXAM UPLOAD] PDF text extracted: ${extractedText.length} chars`);
      } catch (pdfErr) {
        console.warn('[EXAM UPLOAD] pdf-parse failed, falling back to raw extraction:', pdfErr.message);
        // Fallback: try raw text extraction
        const bufStr = fileBuffer.toString('utf-8');
        const textMatches = bufStr.match(/\(([^)]+)\)/g);
        if (textMatches) {
          extractedText = textMatches.map(m => m.slice(1, -1)).join(' ');
        }
      }
    } else {
      // For images, include the filename which may contain useful info
      extractedText = fileName;
    }

    // Also check if user provided exam_text (manual entry option)
    if (req.body.exam_text) {
      extractedText += ' ' + req.body.exam_text;
    }

    // Extract indicators from the text
    const indicators = extractIndicatorsFromText(extractedText);

    // Generate AI analysis text
    const aiAnalysis = generateAiAnalysis(indicators);

    // Ensure exam table has file columns
    await pool.query(`
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS file_size INTEGER;
      ALTER TABLE exams ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'manual';
    `);

    // Create exam record
    const examResult = await pool.query(
      `INSERT INTO exams (patient_id, exam_name, category, status, result, ai_analysis, result_date, uploaded_by, file_name, file_type, file_size, source, notes)
       VALUES ($1, $2, 'laboratorial', 'concluido', $3, $4, NOW(), $5, $6, $7, $8, 'upload_paciente', $9) RETURNING *`,
      [
        patientId, fileName,
        indicators.length > 0 ? JSON.stringify(indicators) : null,
        aiAnalysis, userId,
        req.file.originalname, fileMimeType, req.file.size,
        req.body.notes || null
      ]
    );
    const exam = examResult.rows[0];

    // If indicators were found, store them and trigger notifications
    let notificationResult = null;
    if (indicators.length > 0) {
      // Store each indicator
      for (const ind of indicators) {
        const threshold = THRESHOLDS[ind.name];
        await pool.query(
          `INSERT INTO health_indicators (patient_user_id, indicator_name, value, unit, recorded_at, source)
           VALUES ($1, $2, $3, $4, NOW(), 'exam_upload')`,
          [userId, ind.name, ind.value, threshold ? threshold.unit : '']
        );
      }

      // Trigger notifications if any indicator is abnormal
      notificationResult = await checkAndNotify(userId, indicators);

      // Update triage if there are alerts
      const hasAlerts = indicators.some(ind => classifyIndicator(ind.name, ind.value) === 'alerta');
      if (hasAlerts) {
        const alertIndicators = indicators.filter(ind => classifyIndicator(ind.name, ind.value) !== 'normal');
        const triageColor = hasAlerts ? 'amarelo' : 'verde';
        const symptomsSummary = alertIndicators.map(ind => {
          const t = THRESHOLDS[ind.name];
          return `${t ? t.label : ind.name}: ${ind.value} ${t ? t.unit : ''}`;
        }).join('; ');

        // Check if patient has existing triage record
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
             VALUES ($1, $2, $3, $4, $5, 'aguardando')
             ON CONFLICT DO NOTHING`,
            [patientId || userId, triageColor, symptomsSummary, aiAnalysis, hasAlerts ? 7 : 4]
          ).catch(() => {});
        }
      }
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

router.get('/', async (req, res) => {
  try {
    const { patient_id, status } = req.query;
    let query = `SELECT e.*, p.full_name as patient_name, pr.full_name as professional_name
                 FROM exams e
                 LEFT JOIN patients p ON e.patient_id = p.id
                 LEFT JOIN professionals pr ON e.professional_id = pr.id`;
    const params = [];
    const conditions = [];
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
