const router = require('express').Router();
const groq = require('../services/groq');

// Local fallback used only when the LLM is unavailable.
const FALLBACK = 'Estou com uma instabilidade momentanea para responder. Se for urgente, procure atendimento imediato (SAMU 192) ou, em crise emocional, ligue para o CVV no 188. Voce tambem pode iniciar uma teleconsulta pela vivas. Pode tentar novamente em instantes?';

// POST /api/vivi/chat — LLM-powered health/psychiatry/psychology assistant
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem e obrigatoria' });
    }

    if (!groq.isConfigured()) {
      console.warn('[VIVI] GROQ_API_KEY not configured — returning fallback');
      return res.json({ reply: FALLBACK, source: 'fallback' });
    }

    const reply = await groq.viviChat(history, message.trim());
    res.json({ reply, source: 'llm' });
  } catch (err) {
    console.error('[VIVI] chat error:', err.message);
    res.json({ reply: FALLBACK, source: 'error' });
  }
});

module.exports = router;
