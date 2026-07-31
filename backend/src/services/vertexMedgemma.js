// MedGemma (Google Health AI) provider via Vertex AI.
//
// MedGemma is an open medical model (Gemma-based). On Google Cloud it is used
// either through a dedicated Vertex AI endpoint (the model deployed to a GPU
// endpoint from Model Garden) or a Model-as-a-Service OpenAI-compatible route.
// Both expose an OpenAI-compatible `/chat/completions` API, so this provider
// speaks that dialect and stays agnostic to how the model is served.
//
// Config (env):
//   VERTEX_PROJECT_ID           GCP project id
//   VERTEX_LOCATION             region, e.g. "us-central1"
//   VERTEX_MEDGEMMA_MODEL       model name sent in the payload
//                               (e.g. "medgemma" or the deployed model id)
//   VERTEX_MEDGEMMA_URL         (optional) full chat/completions URL. If unset,
//                               it is derived from the vars below.
//   VERTEX_MEDGEMMA_ENDPOINT_ID (optional) numeric id of a dedicated endpoint.
//
// Credentials (either one):
//   GOOGLE_VERTEX_SA_KEY            the service-account JSON key as a string
//                               (preferred on Fly/containers — no file needed).
//   GOOGLE_APPLICATION_CREDENTIALS  path to the service-account JSON key file
//                               (standard Application Default Credentials).

let GoogleAuth;
try {
  ({ GoogleAuth } = require('google-auth-library'));
} catch {
  GoogleAuth = null;
}

function hasCredentials() {
  return !!(process.env.GOOGLE_VERTEX_SA_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

let authClientPromise = null;
function getAccessTokenProvider() {
  if (!GoogleAuth) throw new Error('google-auth-library not installed');
  if (!authClientPromise) {
    const opts = { scopes: ['https://www.googleapis.com/auth/cloud-platform'] };
    // Prefer the JSON key passed inline (env var), so no key file is required.
    if (process.env.GOOGLE_VERTEX_SA_KEY) {
      let credentials;
      try {
        credentials = JSON.parse(process.env.GOOGLE_VERTEX_SA_KEY);
      } catch {
        throw new Error('GOOGLE_VERTEX_SA_KEY is not valid JSON');
      }
      opts.credentials = credentials;
      if (credentials.project_id && !process.env.VERTEX_PROJECT_ID) {
        opts.projectId = credentials.project_id;
      }
    }
    const auth = new GoogleAuth(opts);
    authClientPromise = auth.getClient();
  }
  return authClientPromise;
}

function isConfigured() {
  return !!(
    GoogleAuth &&
    hasCredentials() &&
    process.env.VERTEX_PROJECT_ID &&
    process.env.VERTEX_LOCATION &&
    (process.env.VERTEX_MEDGEMMA_URL || process.env.VERTEX_MEDGEMMA_ENDPOINT_ID)
  );
}

function chatCompletionsUrl() {
  if (process.env.VERTEX_MEDGEMMA_URL) return process.env.VERTEX_MEDGEMMA_URL;
  const project = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION;
  const endpointId = process.env.VERTEX_MEDGEMMA_ENDPOINT_ID;
  // Model Garden deploys a DEDICATED endpoint, whose OpenAI-compatible route
  // lives on a per-endpoint DNS (…prediction.vertexai.goog), NOT on the shared
  // *-aiplatform.googleapis.com host. Prefer VERTEX_MEDGEMMA_DNS when provided.
  const dns = process.env.VERTEX_MEDGEMMA_DNS;
  const host = dns ? `https://${dns}` : `https://${location}-aiplatform.googleapis.com`;
  return `${host}/v1beta1/projects/${project}/locations/${location}/endpoints/${endpointId}/chat/completions`;
}

// MedGemma 1.5 answers in a "thinking" format: an internal reasoning block
// wrapped in <unused94>thought … <unused95>, followed by the final answer. Keep
// only the final answer (everything after the last <unused95>); if the marker is
// absent, drop a leading "<unused94>thought" preamble as a best effort.
function stripThinking(text) {
  if (typeof text !== 'string') return text;
  const marker = '<unused95>';
  const idx = text.lastIndexOf(marker);
  let out = idx !== -1 ? text.slice(idx + marker.length) : text;
  out = out.replace(/^<unused9\d>\s*thought[\s\S]*/i, '').trim() || out;
  return out.replace(/<unused9\d>/g, '').trim();
}

async function chatCompletion(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error('Vertex MedGemma not configured');
  }

  const client = await getAccessTokenProvider();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error('failed to obtain Vertex AI access token');

  // MedGemma spends tokens on its internal "thought" before the answer, so we
  // add a thinking budget on top of the caller's desired answer length —
  // otherwise the response is cut off mid-reasoning and no answer is returned.
  const answerTokens = options.maxTokens || 900;
  const thinkTokens = parseInt(process.env.VERTEX_MEDGEMMA_THINK_TOKENS || '3000', 10);
  const body = {
    model: options.model || process.env.VERTEX_MEDGEMMA_MODEL || 'medgemma',
    messages,
    temperature: options.temperature != null ? options.temperature : 0.5,
    max_tokens: answerTokens + thinkTokens,
    top_p: options.topP != null ? options.topP : 0.9,
    // Penalize repetition — MedGemma can otherwise fall into a degenerate loop
    // (e.g. echoing a numeric series forever) and never reach its conclusion.
    frequency_penalty: options.frequencyPenalty != null ? options.frequencyPenalty : 0.6,
    presence_penalty: options.presencePenalty != null ? options.presencePenalty : 0.3,
  };

  // MedGemma's thinking makes it much slower than Groq, so callers' tight
  // timeouts (tuned for Groq) would abort mid-generation. Treat the configured
  // value as a FLOOR the caller cannot undercut.
  const controller = new AbortController();
  const timeoutFloor = parseInt(process.env.VERTEX_MEDGEMMA_TIMEOUT_MS || '240000', 10);
  const timeout = setTimeout(() => controller.abort(), Math.max(options.timeoutMs || 0, timeoutFloor));

  try {
    const res = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Vertex MedGemma error ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Vertex MedGemma returned empty response');
    const answer = stripThinking(content);
    if (!answer) throw new Error('Vertex MedGemma returned only reasoning, no answer');
    return answer;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isConfigured, chatCompletion };
