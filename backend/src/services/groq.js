// Groq LLM service — powers the Vivi assistant and exam analysis.
// Uses the Groq Chat Completions API (OpenAI-compatible).

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function isConfigured() {
  return !!process.env.GROQ_API_KEY;
}

async function chatCompletion(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error('GROQ_API_KEY not configured');
  }

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
6. Finalize com a frase: "Esta analise e um suporte preventivo baseado em IA e nao substitui a avaliacao de um profissional de saude."`,
    },
    {
      role: 'user',
      content: `Indicadores extraidos do exame:\n${indicatorLines}\n\nTrecho do texto do exame (pode conter ruido):\n"""${excerpt}"""\n\nGere a analise preventiva.`,
    },
  ];

  return chatCompletion(messages, { temperature: 0.4, maxTokens: 800 });
}

// LLM-generated comparative/historical analysis across multiple exams over time.
async function analyzeExamComparison(trends) {
  const lines = (trends || []).map(t => {
    const prev = t.previous_value != null ? `${t.previous_value} ${t.unit}` : 'sem histórico';
    const dir = t.direction === 'estavel' ? 'estável' : (t.direction === 'subiu' ? 'subiu' : 'desceu');
    const trendTxt = t.previous_value != null
      ? `${dir}${t.delta_pct != null ? ` (${t.delta_pct > 0 ? '+' : ''}${t.delta_pct}%)` : ''}${t.worsening ? ', PIORA' : (t.direction !== 'estavel' ? ', melhora' : '')}`
      : 'primeira medição';
    return `- ${t.label}: anterior ${prev} -> atual ${t.current_value} ${t.unit} [${t.count} medição(ões), ${trendTxt}, classificação atual: ${t.current_status}]`;
  }).join('\n');

  const messages = [
    {
      role: 'system',
      content: `Voce e um assistente de analise preventiva da plataforma VivaS, especializado em saude.
Voce recebe a EVOLUCAO HISTORICA e COMPARATIVA de indicadores de exames de um paciente (varios exames ao longo do tempo).
Gere uma analise comparativa educativa em portugues do Brasil.

REGRAS:
1. NAO forneca diagnostico medico definitivo — apenas orientacao preventiva educativa.
2. Destaque as TENDENCIAS (melhora, piora ou estabilidade) e o que uma variacao pode significar de forma preventiva.
3. Priorize os indicadores que pioraram ou estao fora da faixa de referencia.
4. Sugira acoes preventivas gerais (habitos, acompanhamento) sem prescrever medicamentos ou doses.
5. Reforce que o paciente deve confirmar com um profissional de saude (medico) pela VivaS.
6. Seja objetivo e estruturado. Use no maximo ~280 palavras.
7. Finalize com: "Esta analise comparativa e um suporte preventivo baseado em IA e nao substitui a avaliacao de um profissional de saude."`,
    },
    {
      role: 'user',
      content: `Evolucao dos indicadores do paciente:\n${lines || '(sem indicadores estruturados)'}\n\nGere a analise comparativa preventiva.`,
    },
  ];

  return chatCompletion(messages, { temperature: 0.4, maxTokens: 900 });
}

module.exports = {
  isConfigured,
  chatCompletion,
  viviChat,
  analyzeExamIndicators,
  analyzeExamComparison,
  VIVI_SYSTEM_PROMPT,
  DEFAULT_MODEL,
};
