const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('./auth');

const PLANS = {
  individual: {
    name: 'Individual',
    price: 4990, // cents
    oldPrice: 7990,
    maxMembers: 1,
    features: ['Linha do tempo de saúde', 'Interpretação de exames por IA', 'Alertas preventivos 24h', 'Triagem inteligente', 'Teleconsultas incluídas']
  },
  familia: {
    name: 'Família',
    price: 8990,
    oldPrice: 14990,
    maxMembers: 4,
    features: ['Tudo do Individual', 'Até 4 perfis', 'Painel familiar', 'Alertas para cada membro', 'Prioridade no atendimento']
  },
  empresa: {
    name: 'Empresa',
    price: 2990, // per life
    oldPrice: null,
    maxMembers: 999,
    features: ['Tudo do Família', 'Painel RH', 'Relatórios anonimizados', 'Onboarding assistido']
  }
};

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Create checkout session (no auth required - user doesn't have account yet)
router.post('/checkout', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ error: 'Stripe não configurado' });
    
    const { plan, email } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plano inválido' });
    
    const planData = PLANS[plan];
    
    if (plan === 'empresa') {
      return res.json({ redirect: 'mailto:contato@vivasaudeinteligente.com.br?subject=VivaS Empresas' });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: `VivaS ${planData.name}`, description: planData.features.join(' · ') },
          unit_amount: planData.price,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      success_url: `${req.headers.origin || 'https://vivas.digital'}/register?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${req.headers.origin || 'https://vivasaudeinteligente.com.br'}/#planos`,
      metadata: { plan, maxMembers: String(planData.maxMembers) }
    });
    
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
});

// Verify checkout session (no auth - used during registration)
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      // Dev mode: allow registration without Stripe
      return res.json({
        valid: true,
        plan: req.query.plan || 'individual',
        email: null,
        maxMembers: PLANS[req.query.plan || 'individual']?.maxMembers || 1,
        customerId: 'dev_mode'
      });
    }
    
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status !== 'paid') {
      return res.json({ valid: false, error: 'Pagamento não confirmado' });
    }
    
    const plan = session.metadata.plan;
    res.json({
      valid: true,
      plan,
      email: session.customer_email,
      maxMembers: parseInt(session.metadata.maxMembers),
      customerId: session.customer
    });
  } catch (err) {
    console.error('Verify session error:', err);
    res.status(400).json({ valid: false, error: 'Sessão inválida' });
  }
});

// Get current user's subscription (requires auth)
router.get('/my-subscription', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ subscription: null });
    }
    const sub = result.rows[0];
    res.json({
      subscription: {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        maxMembers: sub.max_members,
        stripeCustomerId: sub.stripe_customer_id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        currentPeriodEnd: sub.current_period_end,
        createdAt: sub.created_at
      }
    });
  } catch (err) {
    console.error('Get subscription error:', err);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

// Get family members (requires auth)
router.get('/family-members', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.email, p.date_of_birth, p.gender, p.titular_id,
              CASE WHEN p.titular_id IS NULL AND p.user_id = $1 THEN true ELSE false END as is_titular
       FROM patients p
       WHERE p.user_id = $1 OR p.titular_id = (
         SELECT id FROM patients WHERE user_id = $1 AND titular_id IS NULL LIMIT 1
       )
       ORDER BY p.titular_id NULLS FIRST, p.name`,
      [req.user.id]
    );
    res.json({ members: result.rows });
  } catch (err) {
    console.error('Get family members error:', err);
    res.status(500).json({ error: 'Erro ao buscar membros da família' });
  }
});

// Add family member (requires auth)
router.post('/family-members', authenticate, async (req, res) => {
  try {
    // Check subscription
    const subResult = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [req.user.id, 'active']
    );
    if (subResult.rows.length === 0) {
      return res.status(403).json({ error: 'Assinatura ativa necessária' });
    }
    const sub = subResult.rows[0];
    
    // Get titular patient
    const titularResult = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1 AND titular_id IS NULL LIMIT 1',
      [req.user.id]
    );
    if (titularResult.rows.length === 0) {
      return res.status(400).json({ error: 'Paciente titular não encontrado' });
    }
    const titularId = titularResult.rows[0].id;
    
    // Count current members
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM patients WHERE titular_id = $1',
      [titularId]
    );
    const currentDependents = parseInt(countResult.rows[0].count);
    if (currentDependents + 1 >= sub.max_members) {
      return res.status(400).json({ error: `Limite de ${sub.max_members} membros atingido (titular + ${sub.max_members - 1} dependentes)` });
    }
    
    const { name, email, dateOfBirth, gender, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const result = await pool.query(
      `INSERT INTO patients (name, email, date_of_birth, gender, phone, titular_id, user_id, convenio, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'VivaS', 'ativo')
       RETURNING *`,
      [name, email || null, dateOfBirth || null, gender || null, phone || null, titularId, req.user.id]
    );
    
    res.status(201).json({ member: result.rows[0] });
  } catch (err) {
    console.error('Add family member error:', err);
    res.status(500).json({ error: 'Erro ao adicionar membro' });
  }
});

// Remove family member
router.delete('/family-members/:id', authenticate, async (req, res) => {
  try {
    const titularResult = await pool.query(
      'SELECT id FROM patients WHERE user_id = $1 AND titular_id IS NULL LIMIT 1',
      [req.user.id]
    );
    if (titularResult.rows.length === 0) {
      return res.status(403).json({ error: 'Não autorizado' });
    }
    
    await pool.query(
      'DELETE FROM patients WHERE id = $1 AND titular_id = $2',
      [req.params.id, titularResult.rows[0].id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Remove family member error:', err);
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
});

// Get plan info (public)
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(200).send();
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    try {
      await pool.query(
        `UPDATE subscriptions SET status = $1, current_period_end = $2 WHERE stripe_subscription_id = $3`,
        [subscription.status === 'active' ? 'active' : 'canceled', new Date(subscription.current_period_end * 1000), subscription.id]
      );
    } catch (err) {
      console.error('Webhook DB error:', err);
    }
  }
  
  res.json({ received: true });
});

// Quote system - generate and send quote by email
router.post('/quote', async (req, res) => {
  try {
    const { plan, dependentes, mental, empresa, nome, email, telefone } = req.body;
    if (!email || !nome || !plan) {
      return res.status(400).json({ error: 'Nome, email e tipo de plano são obrigatórios' });
    }

    // Calculate prices
    let base = plan === 'individual' ? 49.90 : 89.90;
    let mentalAdd = mental ? (plan === 'individual' ? 29.90 : 49.90) : 0;
    let empresaAdd = empresa ? 29.90 : 0;
    let depAdd = plan === 'familia' ? (parseInt(dependentes) || 0) * 19.90 : 0;
    let total = base + mentalAdd + empresaAdd + depAdd;

    // Store quote in DB
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50),
        plan VARCHAR(50) NOT NULL,
        dependentes INT DEFAULT 0,
        mental BOOLEAN DEFAULT false,
        empresa BOOLEAN DEFAULT false,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const quoteResult = await pool.query(
      `INSERT INTO quotes (email, nome, telefone, plan, dependentes, mental, empresa, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [email, nome, telefone || null, plan, parseInt(dependentes) || 0, mental || false, empresa || false, total]
    );
    const quoteId = quoteResult.rows[0].id;

    // Build confirmation URL
    const baseUrl = 'https://vivasaudeinteligente.com.br';
    const confirmUrl = `${baseUrl}/api/subscriptions/confirm-quote?id=${quoteId}&email=${encodeURIComponent(email)}`;

    // Send email with quote
    const nodemailer = require('nodemailer');
    const smtpUser = process.env.SMTP_USER || 'sandrolaudares@gmail.com';
    const smtpPass = process.env.SMTP_PASS;

    if (smtpPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: smtpUser, pass: smtpPass }
      });

      let planLabel = plan === 'individual' ? 'Individual' : 'Família';
      let detailLines = `<tr><td style="padding:8px 0;color:#6B7280">Plano ${planLabel}</td><td style="padding:8px 0;text-align:right;font-weight:600">R$ ${base.toFixed(2).replace('.', ',')}</td></tr>`;
      if (depAdd > 0) detailLines += `<tr><td style="padding:8px 0;color:#6B7280">${dependentes} dependente(s)</td><td style="padding:8px 0;text-align:right;font-weight:600">+ R$ ${depAdd.toFixed(2).replace('.', ',')}</td></tr>`;
      if (mentalAdd > 0) detailLines += `<tr><td style="padding:8px 0;color:#6B7280">Saúde Mental</td><td style="padding:8px 0;text-align:right;font-weight:600">+ R$ ${mentalAdd.toFixed(2).replace('.', ',')}</td></tr>`;
      if (empresaAdd > 0) detailLines += `<tr><td style="padding:8px 0;color:#6B7280">Empresarial</td><td style="padding:8px 0;text-align:right;font-weight:600">+ R$ ${empresaAdd.toFixed(2).replace('.', ',')}</td></tr>`;

      const html = `
        <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 20px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#7B1E3C;font-size:28px;margin:0">VivaS</h1>
            <p style="color:#6B7280;font-size:14px;margin-top:4px">Saúde preventiva inteligente</p>
          </div>
          <p style="font-size:15px;color:#1A1A2E">Olá, <strong>${nome}</strong>!</p>
          <p style="font-size:14px;color:#6B7280;line-height:1.6">Aqui está sua cotação personalizada. Confira os detalhes abaixo:</p>
          <div style="background:#7B1E3C;border-radius:12px;padding:24px;text-align:center;margin:20px 0;color:white">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8">Valor mensal</div>
            <div style="font-size:36px;font-weight:700;margin-top:4px">R$ ${total.toFixed(2).replace('.', ',')}<span style="font-size:14px;opacity:0.7">/mês</span></div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">${detailLines}</table>
          <div style="text-align:center;margin:28px 0">
            <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#7B1E3C,#5E1730);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">Confirmar e contratar</a>
          </div>
          <p style="font-size:12px;color:#9CA3AF;text-align:center">Este link expira em 48 horas. Se não solicitou esta cotação, ignore este email.</p>
          <hr style="border:none;border-top:1px solid #F3F4F6;margin:24px 0">
          <p style="font-size:11px;color:#9CA3AF;text-align:center">VivaS Saúde Inteligente - vivasaudeinteligente.com.br</p>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"VivaS Saúde" <${smtpUser}>`,
        to: email,
        subject: 'VivaS - Sua cotação está pronta!',
        html
      });
      console.log(`[QUOTE] Email sent to ${email} - Response: ${info.response}`);
    } else {
      console.log(`[QUOTE] No SMTP_PASS - Email would be sent to ${email} - Total: R$ ${total.toFixed(2)}`);
    }

    res.json({ success: true, quoteId, total, confirmUrl });
  } catch (err) {
    console.error('Quote error:', err);
    res.status(500).json({ error: 'Erro ao gerar cotação' });
  }
});

// Confirm quote - redirect to Stripe checkout
router.get('/confirm-quote', async (req, res) => {
  try {
    const { id, email, plan, mental, empresa, dependentes } = req.query;

    let quoteData = null;
    if (id) {
      const result = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
      if (result.rows.length > 0) {
        quoteData = result.rows[0];
        await pool.query("UPDATE quotes SET status = 'confirmed' WHERE id = $1", [id]);
      }
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.redirect(`https://vivas.digital/register?plan=${quoteData?.plan || plan || 'individual'}`);
    }

    const planType = quoteData?.plan || plan || 'individual';
    const hasMental = quoteData?.mental || mental === 'true';
    const hasEmpresa = quoteData?.empresa || empresa === 'true';
    const deps = quoteData?.dependentes || parseInt(dependentes) || 0;
    const customerEmail = quoteData?.email || email;

    // Calculate total in cents
    let base = planType === 'individual' ? 4990 : 8990;
    let mentalAdd = hasMental ? (planType === 'individual' ? 2990 : 4990) : 0;
    let empresaAdd = hasEmpresa ? 2990 : 0;
    let depAdd = planType === 'familia' ? deps * 1990 : 0;
    let totalCents = base + mentalAdd + empresaAdd + depAdd;

    let description = `VivaS ${planType === 'individual' ? 'Individual' : 'Família'}`;
    if (hasMental) description += ' + Saúde Mental';
    if (hasEmpresa) description += ' + Empresarial';
    if (deps > 0) description += ` (${deps} dep.)`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: customerEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: { name: description },
          unit_amount: totalCents,
          recurring: { interval: 'month' }
        },
        quantity: 1
      }],
      success_url: `https://vivas.digital/register?session_id={CHECKOUT_SESSION_ID}&plan=${planType}`,
      cancel_url: 'https://vivasaudeinteligente.com.br/cotacao',
      metadata: { plan: planType, mental: String(hasMental), empresa: String(hasEmpresa), dependentes: String(deps) }
    });

    res.redirect(session.url);
  } catch (err) {
    console.error('Confirm quote error:', err);
    res.redirect('https://vivasaudeinteligente.com.br/cotacao?error=1');
  }
});

module.exports = router;
