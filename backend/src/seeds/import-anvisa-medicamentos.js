/**
 * Import ANVISA registered medications from the official open-data CSV
 * (https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv) into the
 * medicamentos_anvisa table. The prescription form queries this table so the
 * professional gets medication data (princípio ativo, registro, classe, empresa)
 * sourced from ANVISA.
 *
 * Idempotent: truncates the table and reloads. Safe to re-run periodically.
 *
 * Usage: node src/seeds/import-anvisa-medicamentos.js [path-to-csv]
 * If no local path is given, downloads the CSV from ANVISA.
 */
const fs = require('fs');
const https = require('https');
const pool = require('../config/database');

const ANVISA_CSV_URL = 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv';

function download(url) {
  return new Promise((resolve, reject) => {
    // ANVISA's server presents an incomplete certificate chain; relax verification
    // for this trusted government open-data host only.
    https.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} baixando CSV da ANVISA`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// Parse a single semicolon-delimited CSV line honoring double-quoted fields.
function parseLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function run() {
  const localPath = process.argv[2];
  let buffer;
  if (localPath && fs.existsSync(localPath)) {
    console.log(`Lendo CSV local: ${localPath}`);
    buffer = fs.readFileSync(localPath);
  } else {
    console.log(`Baixando CSV da ANVISA: ${ANVISA_CSV_URL}`);
    buffer = await download(ANVISA_CSV_URL);
  }
  // ANVISA CSV is Latin-1 (ISO-8859-1) encoded.
  const text = buffer.toString('latin1');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseLine(lines[0]).map((h) => h.trim());
  const idx = (name) => header.indexOf(name);

  const iTipo = idx('TIPO_PRODUTO');
  const iNome = idx('NOME_PRODUTO');
  const iCategoria = idx('CATEGORIA_REGULATORIA');
  const iRegistro = idx('NUMERO_REGISTRO_PRODUTO');
  const iClasse = idx('CLASSE_TERAPEUTICA');
  const iEmpresa = idx('EMPRESA_DETENTORA_REGISTRO');
  const iSituacao = idx('SITUACAO_REGISTRO');
  const iPrincipio = idx('PRINCIPIO_ATIVO');

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseLine(lines[i]);
    const nome = (f[iNome] || '').trim();
    if (!nome) continue;
    rows.push([
      nome,
      (f[iPrincipio] || '').trim() || null,
      (f[iClasse] || '').trim() || null,
      (f[iCategoria] || '').trim() || null,
      (f[iRegistro] || '').trim() || null,
      (f[iEmpresa] || '').trim() || null,
      (f[iSituacao] || '').trim() || null,
    ]);
  }

  console.log(`Total de registros a inserir: ${rows.length}`);

  await pool.query('TRUNCATE TABLE medicamentos_anvisa');

  const BATCH = 500;
  let inserted = 0;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const values = [];
    const params = [];
    batch.forEach((r, bi) => {
      const b = bi * 7;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`);
      params.push(...r);
    });
    await pool.query(
      `INSERT INTO medicamentos_anvisa
       (nome_produto, principio_ativo, classe_terapeutica, categoria_regulatoria, numero_registro, empresa_detentora, situacao_registro)
       VALUES ${values.join(',')}`,
      params
    );
    inserted += batch.length;
    if (inserted % 5000 < BATCH) console.log(`  inseridos ${inserted}/${rows.length}`);
  }

  const count = await pool.query('SELECT COUNT(*) FROM medicamentos_anvisa');
  console.log(`Concluído. Total na tabela: ${count.rows[0].count}`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Falha ao importar medicamentos da ANVISA:', err);
  process.exit(1);
});
