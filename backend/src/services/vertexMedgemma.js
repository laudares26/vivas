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
  const host = `https://${location}-aiplatform.googleapis.com`;
  // Dedicated endpoint OpenAI-compatible route.
  return `${host}/v1beta1/projects/${project}/locations/${location}/endpoints/${endpointId}/chat/completions`;
}

async function chatCompletion(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error('Vertex MedGemma not configured');
  }

  const client = await getAccessTokenProvider();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error('failed to obtain Vertex AI access token');

  const body = {
    model: options.model || process.env.VERTEX_MEDGEMMA_MODEL || 'medgemma',
    messages,
    temperature: options.temperature != null ? options.temperature : 0.5,
    max_tokens: options.maxTokens || 900,
    top_p: options.topP != null ? options.topP : 0.9,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 45000);

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
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isConfigured, chatCompletion };
