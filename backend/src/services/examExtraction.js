// Shared exam-parsing helpers used by the upload routes and by backfill/reprocess
// scripts. Extracts structured health indicators (metabolic + hematologic) and
// the collection date from an exam's text/PDF so the longitudinal history is
// built from every exam, not just the latest one.

// Pattern-based indicator extraction from exam text.
// `count: true` marks indicators reported as absolute cell counts using the
// Brazilian thousands separator (e.g. "54.000" = 54000).
const INDICATOR_PATTERNS = [
  // --- Metabolic / biochemistry ---
  { name: 'glicemia_jejum', patterns: [/glic[eê]mia[\s\S]{0,30}?(\d{2,3}[.,]?\d*)\s*mg/i, /glicose[\s\S]{0,30}?(\d{2,3}[.,]?\d*)\s*mg/i] },
  { name: 'colesterol_ldl', patterns: [/ldl[\s\S]{0,30}?(\d{2,3}[.,]?\d*)\s*mg/i, /colesterol\s*ldl[\s\S]{0,30}?(\d{2,3}[.,]?\d*)/i] },
  { name: 'pressao_sistolica', patterns: [/press[aã]o[\s\S]{0,20}?(\d{2,3})\s*[x\/]\s*\d{2,3}/i, /sist[oó]lica[\s\S]{0,20}?(\d{2,3})/i] },
  { name: 'pressao_diastolica', patterns: [/press[aã]o[\s\S]{0,20}?\d{2,3}\s*[x\/]\s*(\d{2,3})/i, /diast[oó]lica[\s\S]{0,20}?(\d{2,3})/i] },
  { name: 'hemoglobina_glicada', patterns: [/hemoglobina\s*glicada[\s\S]{0,30}?(\d{1,2}[.,]\d{1,2})\s*%/i, /hba1c[\s\S]{0,20}?(\d{1,2}[.,]\d{1,2})/i] },
  { name: 'triglicerideos', patterns: [/triglic[eé]r[ií]d[eo]s?[\s\S]{0,30}?(\d{2,4}[.,]?\d*)\s*mg/i] },
  { name: 'creatinina', patterns: [/creatinina[\s\S]{0,30}?(\d{1,2}[.,]\d{1,2})\s*mg/i] },
  { name: 'imc', patterns: [/imc[\s\S]{0,20}?(\d{2}[.,]\d{1,2})/i] },
  // --- Plasma-cell / myeloma-relevant biochemistry (found in routine panels) ---
  // NOTE: these synthetic PDFs render "s" as a space (e.g. "Proteinas totais" ->
  // "Proteina  totai "), so the patterns are written to tolerate that.
  { name: 'proteinas_totais', patterns: [/prote[ií]na?\w*\s+totai\w*[\s\S]{0,15}?(\d{1,2}[.,]\d)\s*g\/dl/i] },
  { name: 'albumina', patterns: [/(?<![a-z])albumina[\s\S]{0,15}?(\d{1,2}[.,]\d)\s*g\/dl/i] },
  { name: 'globulina', patterns: [/(?<![a-z])globulina\w*[\s\S]{0,15}?(\d{1,2}[.,]\d)\s*g\/dl/i] },
  // "Calcio total 11.9 mg/dL" — total serum calcium (not the ionic mmol/L value).
  { name: 'calcio', patterns: [/c[aá]lcio\s+total[\s\S]{0,15}?(\d{1,2}[.,]\d)\s*mg/i] },
  // "Fosfatase alcalina 131 U/L" ("Fo fata e alcalina" after the s->space quirk).
  { name: 'fosfatase_alcalina', patterns: [/alcalina[\s\S]{0,15}?(\d{2,4})\s*u\/l/i] },
  // "VHS (1a hora) 92 mm"
  { name: 'vhs', patterns: [/vhs[\s\S]{0,25}?(\d{1,3})\s*mm/i, /hemo\s*[a-z]*edimenta[\s\S]{0,40}?(\d{1,3})\s*mm/i] },
  { name: 'acido_urico', patterns: [/[aá]cido\s+[uú]rico[\s\S]{0,15}?(\d{1,2}[.,]\d)\s*mg/i] },
  // --- Hematology (hemograma) ---
  // "Hemoglobina 9,8 (*) g/dL" — must not match "Hemoglobina Glicada" (that is %).
  { name: 'hemoglobina', patterns: [/hemoglobina(?!\s*glicada)[\s\S]{0,20}?(\d{1,2}[.,]\d)\s*(?:\(\*\)\s*)?g\/dl/i] },
  // "Leucocitos totais 54.000 (*) /mm3"
  { name: 'leucocitos', count: true, patterns: [/leuc[oó]citos(?:\s*totais)?[\s\S]{0,20}?(\d{1,3}(?:\.\d{3})+|\d{4,7})\s*(?:\(\*\)\s*)?\/?\s*mm/i] },
  // "Linfocitos 85,2% | 46.008 (*) /mm3" — capture the ABSOLUTE count after "|"
  { name: 'linfocitos', count: true, patterns: [/linf[oó]citos[\s\S]{0,20}?\|\s*(\d{1,3}(?:\.\d{3})+|\d{3,7})/i] },
  // "Neutrofilos segmentados 7,0% | 3.780 /mm3" — absolute count after "|"
  { name: 'neutrofilos', count: true, patterns: [/neutr[oó]filos(?:\s*segmentados)?[\s\S]{0,20}?\|\s*(\d{1,3}(?:\.\d{3})+|\d{3,7})/i] },
  // "Plaquetas 95.000 (*) /mm3"
  { name: 'plaquetas', count: true, patterns: [/plaquetas[\s\S]{0,20}?(\d{1,3}(?:\.\d{3})+|\d{4,7})\s*(?:\(\*\)\s*)?\/?\s*mm/i] },
];

function parseIndicatorValue(raw, isCount) {
  if (isCount) {
    // Absolute cell count: strip thousands separators (dots), commas → decimals.
    return parseFloat(String(raw).replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(String(raw).replace(',', '.'));
}

// Urine dipstick proteinuria is reported as crosses ("3+") / "ausente" / "traços".
// Map it to a numeric scale so it can be tracked over time like other indicators.
function extractProteinuria(text) {
  const m = text.match(/prote[ií]n[uú]ria|prote[ií]na?\w*\s+(au\s?ente|negativ\w*|tra[cç]o\w*|\d\s*\+|\++)/i);
  if (!m) return null;
  const token = (m[1] || '').toLowerCase();
  if (!token) {
    // "proteinuria" mentioned but no dipstick token near the label — look wider.
    const m2 = text.match(/prote[ií]n[uú]ria[\s\S]{0,30}?(au\s?ente|negativ\w*|tra[cç]o\w*|\d\s*\+|\++)/i);
    if (!m2) return null;
    return proteinuriaTokenToValue(m2[1].toLowerCase());
  }
  return proteinuriaTokenToValue(token);
}

function proteinuriaTokenToValue(token) {
  if (/au\s?ente|negativ/.test(token)) return 0;
  if (/tra[cç]o/.test(token)) return 0.5;
  const digit = token.match(/(\d)\s*\+/);
  if (digit) return parseInt(digit[1], 10);
  const plus = token.match(/\++/);
  if (plus) return plus[0].length;
  return null;
}

function extractIndicatorsFromText(text) {
  const indicators = [];
  for (const def of INDICATOR_PATTERNS) {
    for (const pattern of def.patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseIndicatorValue(match[1], def.count);
        if (!isNaN(value) && value > 0) {
          indicators.push({ name: def.name, value });
          break;
        }
      }
    }
  }

  // Proteinúria (urina EAS) — allow value 0 (ausente) as a valid reading.
  const protUria = extractProteinuria(text);
  if (protUria != null && !isNaN(protUria)) {
    indicators.push({ name: 'proteinuria', value: protUria });
  }

  // Relação albumina/globulina (A/G) — computed when both are present. A falling
  // ratio (inversion) is a classic plasma-cell dyscrasia signal.
  const alb = indicators.find(i => i.name === 'albumina');
  const glob = indicators.find(i => i.name === 'globulina');
  if (alb && glob && glob.value > 0) {
    indicators.push({ name: 'relacao_ag', value: +(alb.value / glob.value).toFixed(2) });
  }

  return indicators;
}

// Parse the exam collection date ("Data da coleta: 22/10/2025") so the indicator
// is recorded at the exam's real date, preserving the longitudinal trajectory.
function extractCollectionDate(text) {
  const m = text.match(/data\s+d[ae]\s+coleta[\/\w\s]*?[:\s]*([0-3]?\d)\/([0-1]?\d)\/(\d{4})/i)
    || text.match(/coleta[\/\w\s]*?[:\s]*([0-3]?\d)\/([0-1]?\d)\/(\d{4})/i)
    || text.match(/data[\/\w\s]*?[:\s]*([0-3]?\d)\/([0-1]?\d)\/(\d{4})/i);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

// Detect critical free-text findings (e.g. immunophenotyping conclusions) that
// carry no numeric indicator but signal a serious hematologic condition.
const CRITICAL_FINDING_PATTERNS = [
  { key: 'leucemia', re: /leucemia|leucêmic|linfoproliferativ|s[ií]ndrome mielodispl/i },
  { key: 'monoclonal', re: /monoclonal|restri[cç][aã]o de cadeia leve|matutes/i },
  { key: 'blastos', re: /blastos|gumprecht|mieloblast|linfoblast/i },
  { key: 'mieloma', re: /mieloma|discrasia de c[eé]lula|gamopatia monoclonal|plasmocit|pico monoclonal|banda monoclonal|imunofixa/i },
  { key: 'lesao_ossea_litica', re: /l[ií]tica|saca-?boca|osteol[ií]t|les[aã]o? [oó]ssea/i },
];

function extractCriticalFindings(text) {
  const found = [];
  for (const f of CRITICAL_FINDING_PATTERNS) {
    if (f.re.test(text)) found.push(f.key);
  }
  return found;
}

// Extract raw text from an uploaded exam file (PDF text layer or filename for images).
async function extractTextFromFile(fileBuffer, mimeType, fallbackName) {
  let extractedText = '';
  if (mimeType === 'application/pdf') {
    try {
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      const uint8 = new Uint8Array(fileBuffer);
      const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        extractedText += content.items.map(item => item.str).join(' ') + '\n';
      }
    } catch (pdfErr) {
      const bufStr = fileBuffer.toString('utf-8');
      const textMatches = bufStr.match(/\(([^)]+)\)/g);
      if (textMatches) extractedText = textMatches.map(m => m.slice(1, -1)).join(' ');
    }
  } else {
    extractedText = fallbackName || '';
  }
  return extractedText;
}

module.exports = {
  INDICATOR_PATTERNS,
  parseIndicatorValue,
  extractIndicatorsFromText,
  extractCollectionDate,
  extractCriticalFindings,
  extractTextFromFile,
};
