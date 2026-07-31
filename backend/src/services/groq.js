// LLM service — powers the Vivi assistant and exam analysis.
//
// The exam-analysis and assistant prompts all funnel through `chatCompletion`,
// which routes to a pluggable provider selected by env `LLM_PROVIDER`:
//   - "vertex" / "medgemma": MedGemma (Google Health AI) via Vertex AI.
//   - "groq" (default): Groq Chat Completions API (Llama, OpenAI-compatible).
// When the primary provider is Vertex but it is not configured, we transparently
// fall back to Groq so the deterministic safety net below still has an LLM.

const vertexMedgemma = require('./vertexMedgemma');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function preferVertex() {
  const p = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  return p === 'vertex' || p === 'medgemma';
}

function groqConfigured() {
  return !!process.env.GROQ_API_KEY;
}

// True when ANY provider can serve a request. The routes gate LLM usage on this.
function isConfigured() {
  return (preferVertex() && vertexMedgemma.isConfigured()) || groqConfigured();
}

// Which provider actually served the most recent chatCompletion call, so callers
// can persist accurate provenance ("medgemma" vs "groq") with the analysis.
let lastProvider = null;
let lastModel = null;
function getLastProvider() { return lastProvider; }
function getLastModel() { return lastModel; }

async function chatCompletion(messages, options = {}) {
  // Route to MedGemma/Vertex when selected and configured.
  if (preferVertex() && vertexMedgemma.isConfigured()) {
    lastProvider = 'medgemma';
    lastModel = process.env.VERTEX_MEDGEMMA_MODEL || 'medgemma';
    return vertexMedgemma.chatCompletion(messages, options);
  }

  if (!groqConfigured()) {
    throw new Error('no LLM provider configured (set LLM_PROVIDER + credentials)');
  }

  lastProvider = 'groq';
  lastModel = options.model || DEFAULT_MODEL;

  const body = {
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature != null ? options.temperature : 0.5,
    max_tokens: options.maxTokens || 900,
    top_p: options.topP != null ? options.topP : 0.9,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Groq API error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq API returned empty response');
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

// System prompt that scopes Vivi to health, psychiatry and psychology,
// in Brazilian Portuguese, with a strict non-diagnosis guardrail.
const VIVI_SYSTEM_PROMPT = `Voce e a Vivi, assistente virtual de saude da plataforma VivaS Saude Inteligente.

ESPECIALIDADE: Voce e especializada em saude geral, saude preventiva, psiquiatria e psicologia. Responde duvidas sobre bem-estar fisico e mental, exames, sintomas, medicamentos, sono, alimentacao, exercicios, ansiedade, depressao, estresse e saude emocional.

IDIOMA: Responda SEMPRE em portugues do Brasil, de forma clara, acolhedora e empatica.

REGRAS OBRIGATORIAS (guardrails):
1. Voce NUNCA fornece diagnostico medico ou psiquiatrico definitivo. Voce oferece informacao educativa e orientacao preventiva.
2. Sempre que houver indicios de condicao seria, oriente o paciente a procurar um profissional de saude (medico ou psicologo) pela plataforma VivaS (teleconsulta) ou presencialmente.
3. Em situacoes de EMERGENCIA (dor no peito, falta de ar grave, pensamentos suicidas, risco a vida), oriente IMEDIATAMENTE a procurar o pronto-socorro (SAMU 192) ou, em crise emocional, o CVV (Centro de Valorizacao da Vida) pelo telefone 188.
4. Nao prescreva medicamentos nem doses. Nao recomende interromper tratamentos.
5. Seja concisa: respostas de 2 a 5 frases, salvo quando o usuario pedir mais detalhes.
6. Use uma linguagem humana e acolhedora, especialmente em temas de saude mental. Valide os sentimentos do usuario.
7. Quando relevante, sugira recursos da plataforma VivaS: teleconsulta, agendamento, envio de exames, check-in de humor, sessoes com psicologos.

Voce representa a VivaS e deve transmitir confianca, cuidado e profissionalismo.`;

async function viviChat(history, userMessage) {
  const messages = [{ role: 'system', content: VIVI_SYSTEM_PROMPT }];

  // Include recent conversation history (bounded to last 10 turns)
  const recent = Array.isArray(history) ? history.slice(-10) : [];
  for (const m of recent) {
    if (m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
      messages.push({ role: m.role, content: m.content.slice(0, 2000) });
    }
  }

  messages.push({ role: 'user', content: String(userMessage).slice(0, 2000) });

  return chatCompletion(messages, { temperature: 0.6, maxTokens: 700 });
}

// Rich, LLM-generated preventive analysis of extracted lab indicators.
async function analyzeExamIndicators(indicators, extractedText) {
  const indicatorLines = indicators.length
    ? indicators.map(i => `- ${i.label || i.name}: ${i.value} ${i.unit || ''} (classificacao: ${i.status || 'nao classificado'})`).join('\n')
    : '(nenhum indicador estruturado foi extraido automaticamente)';

  const excerpt = (extractedText || '').replace(/\s+/g, ' ').slice(0, 3000);

  const messages = [
    {
      role: 'system',
      content: `Voce e um assistente de analise preventiva de exames laboratoriais da plataforma VivaS, especializado em saude.
Gere uma analise preventiva educativa em portugues do Brasil com base nos indicadores extraidos de um exame.

REGRAS:
1. NAO forneca diagnostico medico definitivo — apenas orientacao preventiva educativa.
2. Explique de forma simples o que cada indicador alterado significa e possiveis implicacoes preventivas.
3. Sugira acoes preventivas gerais (habitos, acompanhamento) sem prescrever medicamentos ou doses.
4. Sempre reforce que o paciente deve confirmar com um profissional de saude (medico) pela VivaS.
5. Seja objetivo e estruturado. Use no maximo ~250 palavras.
6. Finalize com a frase: "Esta analise e um suporte preventivo inteligente e nao substitui a avaliacao de um profissional de saude."`,
    },
    {
      role: 'user',
      content: `Indicadores extraidos do exame:\n${indicatorLines}\n\nTrecho do texto do exame (pode conter ruido):\n"""${excerpt}"""\n\nGere a analise preventiva.`,
    },
  ];

  return chatCompletion(messages, { temperature: 0.4, maxTokens: 800 });
}

// Build a compact per-indicator timeline (todos os exames), downsampled so the
// prompt stays bounded even with dozens of exams.
function buildHistoryTimeline(history) {
  if (!history || typeof history !== 'object') return '';
  const fmt = (d) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return String(d); }
  };
  const blocks = [];
  for (const [name, series] of Object.entries(history)) {
    if (!Array.isArray(series) || series.length === 0) continue;
    // Keep at most ~12 points, evenly sampled, always including first and last.
    let pts = series;
    if (series.length > 12) {
      const step = (series.length - 1) / 11;
      pts = Array.from({ length: 12 }, (_, i) => series[Math.round(i * step)]);
    }
    const seq = pts.map(p => `${fmt(p.recorded_at)}: ${p.value}${p.unit ? ' ' + p.unit : ''}`).join(' | ');
    blocks.push(`- ${name} (${series.length} medições): ${seq}`);
  }
  return blocks.join('\n');
}

// Build a bounded, chronological "dossier" from the raw text of every exam so
// the LLM can reason over the FULL content — not just the indicators our regex
// happened to extract. Downsamples the number of exams and truncates each one
// so the prompt stays within budget even across many years of history.
function buildRawExamDossier(exams, opts = {}) {
  // Defaults kept modest so the request fits within the Groq tokens-per-minute
  // budget; can be raised via env on a higher tier (GROQ_DOSSIER_*).
  const maxExams = opts.maxExams || parseInt(process.env.GROQ_DOSSIER_MAX_EXAMS || '26', 10);
  const perExamChars = opts.perExamChars || parseInt(process.env.GROQ_DOSSIER_PER_EXAM || '650', 10);
  const list = (Array.isArray(exams) ? exams : [])
    .filter(e => e && e.exam_text && e.exam_text.trim())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Evenly sample across the timeline, always keeping the first and last exams.
  let sampled = list;
  if (list.length > maxExams) {
    const step = (list.length - 1) / (maxExams - 1);
    const idx = new Set();
    for (let i = 0; i < maxExams; i++) idx.add(Math.round(i * step));
    sampled = [...idx].sort((a, b) => a - b).map(i => list[i]);
  }

  const fmt = (d) => { try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return String(d); } };
  return {
    text: sampled.map(e => {
      const body = String(e.exam_text).replace(/\s+/g, ' ').trim().slice(0, perExamChars);
      return `### ${fmt(e.date)} — ${e.exam_name || 'Exame'}\n${body}`;
    }).join('\n\n'),
    used: sampled.length,
    total: list.length,
  };
}

// GENERIC analysis: sends the full text of the patient's exams (a bounded
// chronological dossier) to the LLM and lets it identify ANY risk pattern and
// recommend the appropriate confirmatory exams — WITHOUT any disease-specific
// code/regex on our side. A compact structured-trend summary is included as a
// hint, but the model reasons over the raw content.
async function analyzeRawExamHistory(exams, options = {}) {
  const dossier = buildRawExamDossier(exams, options);
  if (!dossier.text) throw new Error('no exam text available for raw analysis');

  const trends = Array.isArray(options.trends) ? options.trends : [];
  const trendLines = trends.length
    ? trends.map(t => `- ${t.label}: ${t.first_value != null ? t.first_value + ' ' + t.unit : '—'} -> ${t.current_value} ${t.unit} [${t.count} exames, atual: ${t.current_status}${t.peak_status && t.peak_status !== 'normal' ? `, pico: ${t.peak_value} (${t.peak_status})` : ''}]`).join('\n')
    : '(sem indicadores estruturados extraidos)';

  const findings = Array.isArray(options.criticalFindings) ? options.criticalFindings : [];
  const findingsBlock = findings.length ? `\n\nAchados textuais sinalizados por triagem interna: ${findings.join(', ')}.` : '';

  const priority = Array.isArray(options.priorityPatterns) ? options.priorityPatterns : [];
  const priorityBlock = priority.length
    ? `\n\nPADROES PRIORITARIOS JA DETECTADOS por triagem determinstica (voce DEVE aborda-los explicitamente na sua analise, correlacionando os indicadores, e recomendar os exames de confirmacao adequados):\n${priority.map(p => `- ${p.text}`).join('\n')}`
    : '';

  const messages = [
    {
      role: 'system',
      content: `Voce e um assistente de analise preventiva da plataforma VivaS, especializado em saude.
Voce recebe o TEXTO INTEGRAL de varios exames de um mesmo paciente, em ordem cronologica (um dossie ao longo do tempo). Sua tarefa e analisar TODO o conjunto e identificar, de forma PREVENTIVA e EDUCATIVA, qualquer padrao de risco que emerja da EVOLUCAO dos exames.

COMO RACIOCINAR:
1. Leia os exames como uma trajetoria: procure tendencias sustentadas (piora/melhora) ao longo dos anos, nao apenas o ultimo exame.
2. Correlacione resultados de exames DIFERENTES na mesma epoca (ex.: sangue + urina + imagem) — muitos padroes so aparecem no conjunto.
3. Identifique QUALQUER condicao cujo risco os exames sugiram (metabolica, cardiovascular, renal, hepatica, hematologica, oncologica, endocrina, etc.). NAO se limite a uma lista fixa.
4. Quando um padrao sugerir risco aumentado de uma condicao, diga "possivel risco de ..." (nunca diagnostico fechado) e recomende EXPLICITAMENTE os EXAMES DE CONFIRMACAO adequados aquele padrao (ex.: eletroforese de proteinas sericas e imunofixacao para suspeita de gamopatia/mieloma; ferritina/saturacao para anemia; TSH para tireoide; etc.), alem do especialista indicado.
5. Ignore distratores: nao ancore um alerta grave em um unico valor levemente alterado se o conjunto aponta para outra coisa.
6. Se houver sinais de gravidade/urgencia, sinalize a necessidade de avaliacao rapida.

REGRAS OBRIGATORIAS:
- NUNCA forneca diagnostico definitivo — apenas orientacao preventiva educativa e recomendacao de exames/especialista.
- NAO prescreva medicamentos nem doses.
- Seja objetivo e estruturado (pode usar topicos). Use no maximo ~350 palavras.
- Escreva em portugues do Brasil.
- Finalize SEMPRE com: "Esta analise comparativa e um suporte preventivo inteligente e nao substitui a avaliacao de um profissional de saude."`,
    },
    {
      role: 'user',
      content: `DOSSIE DE EXAMES (${dossier.used} de ${dossier.total} exames, amostrados ao longo do tempo):\n\n${dossier.text}\n\nResumo de indicadores estruturados (apoio, pode estar incompleto):\n${trendLines}${findingsBlock}${priorityBlock}\n\nGere a analise preventiva considerando a EVOLUCAO de TODO o conjunto de exames e recomende os exames de confirmacao pertinentes.`,
    },
  ];

  return chatCompletion(messages, { temperature: 0.3, maxTokens: 1000, timeoutMs: 45000 });
}

// LLM-generated comparative/historical analysis across multiple exams over time.
// `options.history` (the full per-indicator series) is included so the model
// reasons over EVERY exam, not just the latest reading.
async function analyzeExamComparison(trends, options = {}) {
  const lines = (trends || []).map(t => {
    const prev = t.previous_value != null ? `${t.previous_value} ${t.unit}` : 'sem histórico';
    const dir = t.direction === 'estavel' ? 'estável' : (t.direction === 'subiu' ? 'subiu' : 'desceu');
    const trendTxt = t.previous_value != null
      ? `${dir}${t.delta_pct != null ? ` (${t.delta_pct > 0 ? '+' : ''}${t.delta_pct}%)` : ''}${t.worsening ? ', PIORA' : (t.direction !== 'estavel' ? ', melhora' : '')}`
      : 'primeira medição';
    const peakTxt = t.peak_status && t.peak_status !== 'normal' ? `, pico historico: ${t.peak_value} ${t.unit} (${t.peak_status})` : '';
    return `- ${t.label}: primeiro ${t.first_value != null ? t.first_value + ' ' + t.unit : '—'}, media inicial ${prev} -> atual ${t.current_value} ${t.unit} [${t.count} medição(ões), ${trendTxt}, classificação atual: ${t.current_status}${peakTxt}]`;
  }).join('\n');

  const timeline = buildHistoryTimeline(options.history);
  const totalMeasurements = (trends || []).reduce((s, t) => s + (t.count || 0), 0);

  const findings = Array.isArray(options.criticalFindings) ? options.criticalFindings : [];
  const findingsBlock = findings.length
    ? `\n\nAchados textuais relevantes detectados em laudos do paciente (ex.: imunofenotipagem, morfologia): ${findings.join(', ')}. Considere-os na interpretacao hematologica.`
    : '';

  const priority = Array.isArray(options.priorityPatterns) ? options.priorityPatterns : [];
  const priorityBlock = priority.length
    ? `\n\nPADROES PRIORITARIOS JA DETECTADOS por triagem determinstica (voce DEVE aborda-los explicitamente e recomendar os exames de confirmacao adequados):\n${priority.map(p => `- ${p.text}`).join('\n')}`
    : '';

  const messages = [
    {
      role: 'system',
      content: `Voce e um assistente de analise preventiva da plataforma VivaS, especializado em saude.
Voce recebe TODO O HISTORICO de exames de um paciente (varios exames ao longo do tempo, com a serie completa de cada indicador).
Gere uma analise comparativa educativa em portugues do Brasil que considere TODOS os exames — a trajetoria completa, nao apenas o ultimo resultado.

REGRAS:
1. NAO forneca diagnostico medico definitivo — apenas orientacao preventiva educativa.
2. Analise a EVOLUCAO ao longo de TODO o periodo (do primeiro ao ultimo exame), destacando tendencias sustentadas de piora/melhora e nao so a ultima medicao.
3. Quando um padrao ao longo dos exames sugerir RISCO aumentado de uma condicao, sinalize esse risco de forma preventiva e educativa (como "possivel risco", nunca como diagnostico fechado). Considere, entre outros:
   - metabolico/cardiovascular: pre-diabetes/diabetes (glicemia, hemoglobina glicada), dislipidemia (LDL, triglicerideos), hipertensao (pressao);
   - renal: creatinina em elevacao;
   - HEMATOLOGICO: o conjunto de leucocitose (leucocitos muito elevados) + linfocitose acentuada (linfocitos muito elevados) + anemia (hemoglobina baixa) + plaquetopenia (plaquetas baixas) e um padrao classico de ALERTA que pode sugerir uma neoplasia hematologica, como uma leucemia (ex.: leucemia linfocitica cronica). Nesse caso, sinalize explicitamente "possivel alteracao hematologica / possivel risco de leucemia" e recomende avaliacao HEMATOLOGICA URGENTE — sem afirmar o diagnostico.
   - PLASMA / DISCRASIA DE CELULAS PLASMATICAS / MIELOMA MULTIPLO: quando, ao longo do tempo, houver proteinas totais em elevacao + globulinas elevadas + relacao albumina/globulina (A/G) invertida (caindo), associadas a sinais tipo CRAB — hiperCalcemia (calcio elevado), insuficiencia Renal (creatinina/ureia em elevacao), Anemia e/ou lesoes osseas (Bone) — e ainda VHS muito elevado e/ou proteinuria, esse conjunto (mesmo que cada valor isolado pareca so "um pouco alterado") pode sugerir uma DISCRASIA DE CELULAS PLASMATICAS / possivel MIELOMA MULTIPLO. Nesse caso, sinalize o padrao de forma preventiva e recomende EXPLICITAMENTE, como proximo passo, a realizacao de ELETROFORESE DE PROTEINAS SERICAS (e, se disponivel, imunofixacao, cadeias leves livres kappa/lambda e beta-2-microglobulina), alem de avaliacao com hematologista — sem afirmar diagnostico. Considere o PICO HISTORICO de cada indicador, nao apenas o ultimo exame, pois um exame normal isolado no fim nao descarta a trajetoria. NAO ancore o alerta oncologico em PSA, glicemia ou perfil lipidico (possiveis distratores).
4. Se houver achados textuais de laudos (imunofenotipagem, morfologia, celulas de Gumprecht, restricao de cadeia leve, escore de Matutes, blastos, gamopatia/pico monoclonal, lesoes liticas), integre-os ao raciocinio.
5. Priorize os indicadores que pioraram de forma consistente ou estao fora da faixa de referencia.
6. Sugira acoes preventivas gerais (habitos, acompanhamento, especialista adequado) sem prescrever medicamentos ou doses.
7. Reforce que o paciente deve confirmar com um profissional de saude (medico/hematologista) pela VivaS.
8. Seja objetivo e estruturado. Use no maximo ~320 palavras.
9. Finalize com: "Esta analise comparativa e um suporte preventivo inteligente e nao substitui a avaliacao de um profissional de saude."`,
    },
    {
      role: 'user',
      content: `Resumo por indicador (${totalMeasurements} medições no total):\n${lines || '(sem indicadores estruturados)'}\n\nSerie historica completa (todos os exames):\n${timeline || '(sem série detalhada)'}${findingsBlock}${priorityBlock}\n\nGere a analise comparativa preventiva considerando TODOS os exames.`,
    },
  ];

  return chatCompletion(messages, { temperature: 0.4, maxTokens: 1000 });
}

module.exports = {
  isConfigured,
  chatCompletion,
  viviChat,
  analyzeExamIndicators,
  analyzeExamComparison,
  analyzeRawExamHistory,
  getLastProvider,
  getLastModel,
  preferVertex,
  VIVI_SYSTEM_PROMPT,
  DEFAULT_MODEL,
};
