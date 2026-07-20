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
  return indicators;
}

// Parse the exam collection date ("Data da coleta: 22/10/2025") so the indicator
// is recorded at the exam's real date, preserving the longitudinal trajectory.
function extractCollectionDate(text) {
  const m = text.match(/data\s+d[ae]\s+coleta[:\s]*([0-3]?\d)\/([0-1]?\d)\/(\d{4})/i)
    || text.match(/coleta[:\s]*([0-3]?\d)\/([0-1]?\d)\/(\d{4})/i)
    || text.match(/data[:\s]*([0-3]?\d)\/([0-1]?\d)\/(\d{4})/i);
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
