const nodemailer = require('nodemailer');
const pool = require('../config/database');

// SMTP configuration — uses env vars if available, otherwise logs to console
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[Notifications] SMTP configured:', process.env.SMTP_HOST);
  } else {
    console.log('[Notifications] No SMTP configured — emails will be logged to console');
  }
  return transporter;
}

// Single source of truth for the platform sender address.
// Set SMTP_FROM in the environment to change it (e.g. "vivas" <contato@vivas.digital>).
function getFromAddress() {
  return process.env.SMTP_FROM || '"vivas" <contato@vivas.digital>';
}

// Send a raw email through the shared transporter. Returns {success, ...}.
// Supports optional attachments (nodemailer format). Falls back to console log
// when no SMTP is configured.
async function sendRawEmail({ to, subject, html, attachments }) {
  const transport = getTransporter();
  const emailData = { from: getFromAddress(), to, subject, html, attachments };
  if (transport) {
    try {
      const info = await transport.sendMail(emailData);
      console.log(`[Email] Sent to ${to}: ${subject} (messageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email] Failed to send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }
  console.log(`[Email][LOG] To: ${to} | Subject: ${subject}`);
  return { success: true, logged: true };
}

// Health indicator thresholds (Brazilian clinical standards)
const THRESHOLDS = {
  glicemia_jejum: { unit: 'mg/dL', normal: [70, 99], atencao: [100, 125], alerta: [126, Infinity], label: 'Glicemia em Jejum' },
  colesterol_ldl: { unit: 'mg/dL', normal: [0, 129], atencao: [130, 159], alerta: [160, Infinity], label: 'Colesterol LDL' },
  pressao_sistolica: { unit: 'mmHg', normal: [90, 129], atencao: [130, 139], alerta: [140, Infinity], label: 'Pressão Sistólica' },
  pressao_diastolica: { unit: 'mmHg', normal: [60, 84], atencao: [85, 89], alerta: [90, Infinity], label: 'Pressão Diastólica' },
  imc: { unit: 'kg/m²', normal: [18.5, 24.9], atencao: [25, 29.9], alerta: [30, Infinity], label: 'IMC' },
  hemoglobina_glicada: { unit: '%', normal: [0, 5.6], atencao: [5.7, 6.4], alerta: [6.5, Infinity], label: 'Hemoglobina Glicada' },
  triglicerideos: { unit: 'mg/dL', normal: [0, 149], atencao: [150, 199], alerta: [200, Infinity], label: 'Triglicerídeos' },
  creatinina: { unit: 'mg/dL', normal: [0.6, 1.2], atencao: [1.3, 1.5], alerta: [1.6, Infinity], label: 'Creatinina' },
};

function classifyIndicator(name, value) {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'desconhecido';
  if (value >= threshold.alerta[0]) return 'alerta';
  if (value >= threshold.atencao[0]) return 'atencao';
  return 'normal';
}

async function sendEmail(to, subject, html) {
  const transport = getTransporter();

  const emailData = {
    from: getFromAddress(),
    to,
    subject,
    html,
  };

  if (transport) {
    try {
      const info = await transport.sendMail(emailData);
      console.log(`[Email] Sent to ${to}: ${subject} (messageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email] Failed to send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  } else {
    // Log to console when no SMTP configured
    console.log(`[Email][LOG] To: ${to}`);
    console.log(`[Email][LOG] Subject: ${subject}`);
    console.log(`[Email][LOG] Body: ${html.substring(0, 200)}...`);
    return { success: true, logged: true };
  }
}

function buildPatientAlertEmail(patientName, alerts) {
  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${a.label}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: ${a.status === 'alerta' ? '#DC2626' : '#F59E0B'};">${a.value} ${a.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${a.status === 'alerta' ? 'Alerta' : 'Atenção'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7B1E3C, #5E1730); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">VIVAS Saúde Preventiva</h1>
        <p style="color: #E9C4BE; margin: 5px 0 0;">Monitoramento de Indicadores</p>
      </div>
      <div style="padding: 24px; background: white;">
        <p>Olá <strong>${patientName}</strong>,</p>
        <p>Alguns dos seus indicadores de saúde atingiram níveis que requerem atenção:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px; text-align: left;">Indicador</th>
              <th style="padding: 8px; text-align: left;">Valor</th>
              <th style="padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>${alertRows}</tbody>
        </table>
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px;"><strong>Apoio Preventivo:</strong> Estes dados são suporte preventivo e não constituem diagnóstico médico. Consulte seu profissional de saúde para orientações clínicas.</p>
        </div>
        <p>Recomendamos agendar uma consulta com seu profissional de saúde para avaliação.</p>
        <a href="https://vivas.digital/login" style="display: inline-block; background: #7B1E3C; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">Acessar VIVAS</a>
      </div>
      <div style="padding: 16px; background: #f8fafc; text-align: center; font-size: 12px; color: #6b7280;">
        <p>VIVAS Saúde Inteligente - Suporte Preventivo</p>
      </div>
    </div>
  `;
}

function buildProfessionalAlertEmail(professionalName, patientName, patientEmail, alerts) {
  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${a.label}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: ${a.status === 'alerta' ? '#DC2626' : '#F59E0B'};">${a.value} ${a.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${a.status === 'alerta' ? 'Alerta' : 'Atenção'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7B1E3C, #5E1730); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">VIVAS - Alerta de Paciente</h1>
        <p style="color: #E9C4BE; margin: 5px 0 0;">Monitoramento Preventivo</p>
      </div>
      <div style="padding: 24px; background: white;">
        <p>Olá <strong>${professionalName}</strong>,</p>
        <p>O(A) paciente <strong>${patientName}</strong> (${patientEmail}) apresentou indicadores fora dos limites:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px; text-align: left;">Indicador</th>
              <th style="padding: 8px; text-align: left;">Valor</th>
              <th style="padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>${alertRows}</tbody>
        </table>
        <div style="background: #F6E7E1; border-left: 4px solid #7B1E3C; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px;"><strong>Ação sugerida:</strong> Considere agendar uma consulta de acompanhamento ou teleconsulta com o paciente.</p>
        </div>
        <a href="https://vivas.digital/login" style="display: inline-block; background: #7B1E3C; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">Acessar VIVAS</a>
      </div>
      <div style="padding: 16px; background: #f8fafc; text-align: center; font-size: 12px; color: #6b7280;">
        <p>VIVAS Saúde Inteligente - Notificação Profissional</p>
      </div>
    </div>
  `;
}

async function checkAndNotify(patientUserId, indicators) {
  // indicators: [{ name: 'glicemia_jejum', value: 130 }, ...]
  const alerts = [];

  for (const ind of indicators) {
    const status = classifyIndicator(ind.name, ind.value);
    if (status === 'alerta' || status === 'atencao') {
      const threshold = THRESHOLDS[ind.name];
      alerts.push({
        name: ind.name,
        label: threshold ? threshold.label : ind.name,
        value: ind.value,
        unit: threshold ? threshold.unit : '',
        status,
      });
    }
  }

  if (alerts.length === 0) {
    return { notified: false, reason: 'Todos os indicadores estão normais' };
  }

  // Get patient info
  const patientResult = await pool.query(
    'SELECT id, email, full_name FROM users WHERE id = $1', [patientUserId]
  );
  if (patientResult.rows.length === 0) {
    return { notified: false, reason: 'Paciente não encontrado' };
  }
  const patient = patientResult.rows[0];

  // Get related professionals
  const profResult = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role FROM professional_patient_relationships ppr
     JOIN users u ON u.id = ppr.professional_user_id
     WHERE ppr.patient_user_id = $1 AND u.active = true`, [patientUserId]
  );

  const results = { patient: null, professionals: [] };

  // Send to patient
  const patientHtml = buildPatientAlertEmail(patient.full_name, alerts);
  results.patient = await sendEmail(
    patient.email,
    `VIVAS — Indicadores de saúde requerem atenção`,
    patientHtml
  );

  // Send to each professional
  for (const prof of profResult.rows) {
    const profHtml = buildProfessionalAlertEmail(prof.full_name, patient.full_name, patient.email, alerts);
    const profEmailResult = await sendEmail(
      prof.email,
      `VIVAS — Alerta de paciente: ${patient.full_name}`,
      profHtml
    );
    results.professionals.push({ id: prof.id, name: prof.full_name, email: prof.email, ...profEmailResult });
  }

  // Store notification in DB
  await pool.query(
    `INSERT INTO health_notifications (patient_user_id, alert_data, notified_professionals, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [patientUserId, JSON.stringify(alerts), JSON.stringify(results.professionals.map(p => p.id))]
  );

  return {
    notified: true,
    alerts,
    emailsSent: {
      patient: results.patient,
      professionals: results.professionals,
    },
  };
}

// ---------------------------------------------------------------------------
// Comparative / historical exam analysis
// ---------------------------------------------------------------------------

// For every tracked indicator, a rising value means a worse clinical picture.
const HIGHER_IS_WORSE = {
  glicemia_jejum: true, colesterol_ldl: true, pressao_sistolica: true,
  pressao_diastolica: true, imc: true, hemoglobina_glicada: true,
  triglicerideos: true, creatinina: true,
};

// Load the full ordered history of a patient's indicators.
async function getIndicatorHistory(patientUserId) {
  const { rows } = await pool.query(
    `SELECT indicator_name, value, unit, recorded_at
     FROM health_indicators
     WHERE patient_user_id = $1
     ORDER BY indicator_name, recorded_at ASC`,
    [patientUserId]
  );
  const history = {};
  for (const r of rows) {
    if (!history[r.indicator_name]) history[r.indicator_name] = [];
    history[r.indicator_name].push({
      value: parseFloat(r.value),
      unit: r.unit,
      recorded_at: r.recorded_at,
    });
  }
  return history;
}

// Build a comparative analysis (trend per indicator + list of alerts) from history.
function computeComparativeAnalysis(history) {
  const trends = [];
  const alerts = [];
  const statusRank = { normal: 0, atencao: 1, alerta: 2, desconhecido: 0 };

  for (const [name, series] of Object.entries(history)) {
    if (!series || series.length === 0) continue;
    const threshold = THRESHOLDS[name];
    const label = threshold ? threshold.label : name;
    const unit = threshold ? threshold.unit : (series[series.length - 1].unit || '');

    const latest = series[series.length - 1];
    const first = series[0];

    // Historical baseline vs recent window (robust to single-reading noise):
    // average the earliest and latest few readings so a long-term trajectory
    // across many exams is captured, not just the last two adjacent readings.
    const win = Math.max(1, Math.min(3, Math.floor(series.length / 2)));
    const avg = (arr) => arr.reduce((s, x) => s + x.value, 0) / arr.length;
    const baselineVal = series.length >= 2 ? +avg(series.slice(0, win)).toFixed(2) : null;

    // "anterior" shown to the user is the historical baseline; when there is
    // only a single reading there is no comparison.
    const previousValue = baselineVal;

    const currentStatus = classifyIndicator(name, latest.value);
    const previousStatus = baselineVal != null ? classifyIndicator(name, baselineVal) : null;

    let direction = 'estavel';
    let worsening = false;
    let delta = null;
    let deltaPct = null;
    if (baselineVal != null) {
      delta = +(latest.value - baselineVal).toFixed(2);
      const base = baselineVal !== 0 ? baselineVal : 1;
      deltaPct = +(((latest.value - baselineVal) / base) * 100).toFixed(1);
      const eps = Math.abs(baselineVal) * 0.02; // ignore <2% noise
      if (delta > eps) direction = 'subiu';
      else if (delta < -eps) direction = 'desceu';
      const higherWorse = HIGHER_IS_WORSE[name] !== false;
      if (direction !== 'estavel') {
        worsening = higherWorse ? delta > 0 : delta < 0;
      }
    }

    const trend = {
      name, label, unit,
      count: series.length,
      first_value: first.value, first_date: first.recorded_at,
      previous_value: previousValue,
      current_value: latest.value, current_date: latest.recorded_at,
      delta, delta_pct: deltaPct, direction,
      worsening,
      current_status: currentStatus,
      previous_status: previousStatus,
    };
    trends.push(trend);

    // Flag as alert when the current reading is out of range, OR when the
    // trend worsened enough to move into a worse classification.
    const worsenedClass = previousStatus && statusRank[currentStatus] > statusRank[previousStatus];
    if (currentStatus === 'alerta' || currentStatus === 'atencao' || (worsening && worsenedClass)) {
      alerts.push({
        name, label, unit,
        value: latest.value,
        status: currentStatus === 'normal' ? 'atencao' : currentStatus,
        previous_value: previousValue,
        delta, direction, worsening,
      });
    }
  }

  trends.sort((a, b) => (b.worsening === a.worsening ? 0 : b.worsening ? 1 : -1));
  return { trends, alerts };
}

function trendArrow(direction, worsening) {
  if (direction === 'estavel') return '→ estável';
  const arrow = direction === 'subiu' ? '↑' : '↓';
  return `${arrow} ${worsening ? 'piora' : 'melhora'}`;
}

function buildComparativeTable(trends) {
  return trends.map(t => {
    const color = t.worsening ? '#DC2626' : (t.direction === 'estavel' ? '#6b7280' : '#16A34A');
    const prev = t.previous_value != null ? `${t.previous_value} ${t.unit}` : '—';
    const variation = t.delta == null ? '—' : `${t.delta > 0 ? '+' : ''}${t.delta} ${t.unit} (${t.delta_pct > 0 ? '+' : ''}${t.delta_pct}%)`;
    return `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${t.label}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;">${prev}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${t.current_value} ${t.unit}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:${color};font-weight:600;">${variation}<br/><span style="font-size:11px;">${trendArrow(t.direction, t.worsening)}</span></td>
    </tr>`;
  }).join('');
}

function buildComparativePatientEmail(patientName, trends, aiText) {
  return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#7B1E3C,#5E1730);padding:20px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">VIVAS Saúde Preventiva</h1>
        <p style="color:#E9C4BE;margin:5px 0 0;">Análise Comparativa e Histórica dos seus Exames</p>
      </div>
      <div style="padding:24px;background:white;">
        <p>Olá <strong>${patientName}</strong>,</p>
        <p>Analisamos os exames que você enviou e comparamos com o seu histórico. Veja a evolução dos seus indicadores:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px;text-align:left;">Indicador</th>
            <th style="padding:8px;text-align:left;">Anterior</th>
            <th style="padding:8px;text-align:left;">Atual</th>
            <th style="padding:8px;text-align:left;">Variação</th>
          </tr></thead>
          <tbody>${buildComparativeTable(trends)}</tbody>
        </table>
        ${aiText ? `<div style="background:#F6E9ED;border-left:4px solid #7B1E3C;padding:12px;margin:16px 0;border-radius:4px;"><p style="margin:0;font-size:13px;white-space:pre-line;">${aiText}</p></div>` : ''}
        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;margin:16px 0;border-radius:4px;">
          <p style="margin:0;font-size:13px;"><strong>Apoio Preventivo:</strong> Esta análise comparativa é um suporte preventivo e não constitui diagnóstico médico. Consulte seu profissional de saúde.</p>
        </div>
        <a href="https://vivas.digital/login" style="display:inline-block;background:#7B1E3C;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">Acessar VIVAS</a>
      </div>
      <div style="padding:16px;background:#f8fafc;text-align:center;font-size:12px;color:#6b7280;"><p>VIVAS Saúde Inteligente - Suporte Preventivo</p></div>
    </div>`;
}

function buildComparativeProfessionalEmail(professionalName, patientName, patientEmail, trends, aiText) {
  return `
    <div style="font-family:'Segoe UI',sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#7B1E3C,#5E1730);padding:20px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:22px;">VIVAS — Evolução de Paciente</h1>
        <p style="color:#E9C4BE;margin:5px 0 0;">Análise Comparativa de Exames</p>
      </div>
      <div style="padding:24px;background:white;">
        <p>Olá <strong>${professionalName}</strong>,</p>
        <p>O(A) paciente <strong>${patientName}</strong> (${patientEmail}) enviou novos exames. Segue a evolução comparativa dos indicadores:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px;text-align:left;">Indicador</th>
            <th style="padding:8px;text-align:left;">Anterior</th>
            <th style="padding:8px;text-align:left;">Atual</th>
            <th style="padding:8px;text-align:left;">Variação</th>
          </tr></thead>
          <tbody>${buildComparativeTable(trends)}</tbody>
        </table>
        ${aiText ? `<div style="background:#F6E9ED;border-left:4px solid #7B1E3C;padding:12px;margin:16px 0;border-radius:4px;"><p style="margin:0;font-size:13px;white-space:pre-line;">${aiText}</p></div>` : ''}
        <div style="background:#F6E7E1;border-left:4px solid #7B1E3C;padding:12px;margin:16px 0;border-radius:4px;">
          <p style="margin:0;font-size:13px;"><strong>Ação sugerida:</strong> Avalie a tendência dos indicadores e considere agendar acompanhamento ou teleconsulta.</p>
        </div>
        <a href="https://vivas.digital/login" style="display:inline-block;background:#7B1E3C;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:12px;">Acessar VIVAS</a>
      </div>
      <div style="padding:16px;background:#f8fafc;text-align:center;font-size:12px;color:#6b7280;"><p>VIVAS Saúde Inteligente - Notificação Profissional</p></div>
    </div>`;
}

// Send the comparative/historical report to patient + related professionals.
// Only emails when there is at least one alert (worsening/out-of-range) — matching
// the existing single-exam notification behaviour.
async function sendComparativeReport(patientUserId, comparative, aiText) {
  const { trends, alerts } = comparative;
  if (!alerts || alerts.length === 0) {
    return { notified: false, reason: 'Nenhuma tendência preocupante identificada', trends };
  }

  const patientResult = await pool.query(
    'SELECT id, email, full_name FROM users WHERE id = $1', [patientUserId]
  );
  if (patientResult.rows.length === 0) {
    return { notified: false, reason: 'Paciente não encontrado', trends };
  }
  const patient = patientResult.rows[0];

  const profResult = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role FROM professional_patient_relationships ppr
     JOIN users u ON u.id = ppr.professional_user_id
     WHERE ppr.patient_user_id = $1 AND u.active = true`, [patientUserId]
  );

  const results = { patient: null, professionals: [] };

  results.patient = await sendEmail(
    patient.email,
    'VIVAS — Análise comparativa dos seus exames',
    buildComparativePatientEmail(patient.full_name, trends, aiText)
  );

  for (const prof of profResult.rows) {
    const profEmailResult = await sendEmail(
      prof.email,
      `VIVAS — Evolução de exames do paciente: ${patient.full_name}`,
      buildComparativeProfessionalEmail(prof.full_name, patient.full_name, patient.email, trends, aiText)
    );
    results.professionals.push({ id: prof.id, name: prof.full_name, email: prof.email, ...profEmailResult });
  }

  try {
    await pool.query(
      `INSERT INTO health_notifications (patient_user_id, alert_data, notified_professionals, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [patientUserId, JSON.stringify({ type: 'comparativo', alerts }), JSON.stringify(results.professionals.map(p => p.id))]
    );
  } catch (e) {
    console.warn('[Notifications] Failed to store comparative notification:', e.message);
  }

  return {
    notified: true,
    alerts,
    trends,
    emailsSent: { patient: results.patient, professionals: results.professionals },
  };
}

const PLATFORM_URL = 'https://vivas.digital';
const SITE_URL = 'https://vivasaudeinteligente.com.br';

function emailShell(title, subtitle, innerHtml) {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #7B1E3C, #5E1730); padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">vivas</h1>
        <p style="color: #E9C4BE; margin: 6px 0 0; font-size: 14px;">${subtitle}</p>
      </div>
      <div style="padding: 28px; background: white; color: #1f2937;">
        ${innerHtml}
      </div>
      <div style="padding: 16px; background: #f8fafc; text-align: center; font-size: 12px; color: #6b7280;">
        <p>vivas Saúde Inteligente${title ? ' — ' + title : ''}</p>
      </div>
    </div>`;
}

// Invite email for an unregistered patient — first consultation is free.
async function sendInvitePatientEmail({ patientName, patientEmail, professionalName, specialty, dateTime, notes }) {
  const when = dateTime
    ? new Date(dateTime).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
    : 'a combinar';
  const inner = `
    <p>Olá <strong>${patientName || 'paciente'}</strong>,</p>
    <p>Você foi convidado(a) por <strong>${professionalName}</strong>${specialty ? ` (${specialty})` : ''} para uma consulta na vivas — e a sua <strong>primeira consulta é gratuita</strong>.</p>
    <div style="background:#F6E7E1;border-left:4px solid #7B1E3C;padding:16px;margin:18px 0;border-radius:6px;">
      <p style="margin:0 0 6px;"><strong>Profissional:</strong> ${professionalName}${specialty ? ' · ' + specialty : ''}</p>
      <p style="margin:0 0 6px;"><strong>Data e hora:</strong> ${when}</p>
      ${notes ? `<p style="margin:0;"><strong>Observações:</strong> ${notes}</p>` : ''}
      <p style="margin:8px 0 0;color:#7B1E3C;font-weight:700;">1ª consulta gratuita</p>
    </div>
    <p>Para acessar a plataforma e acompanhar sua consulta, crie seu acesso gratuito:</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${PLATFORM_URL}/register?convite=${encodeURIComponent(patientEmail || '')}" style="display:inline-block;background:#7B1E3C;color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;">Acessar a vivas</a>
    </div>
    <p style="color:#6B5B62;font-size:13px;">Após a sua primeira consulta, você receberá um convite especial com <strong>5% de desconto</strong> no plano que escolher.</p>`;
  return sendEmail(patientEmail, 'Você foi convidado(a) para uma consulta gratuita na vivas', emailShell('Convite de consulta', 'Convite de consulta', inner));
}

// Post-consultation email offering 5% discount to subscribe to any plan.
async function sendPostConsultDiscountEmail({ patientName, patientEmail, discountCode, discountPercent = 5 }) {
  const link = `${SITE_URL}/?desconto=${encodeURIComponent(discountCode)}#planos`;
  const inner = `
    <p>Olá <strong>${patientName || 'paciente'}</strong>,</p>
    <p>Esperamos que sua primeira consulta na vivas tenha sido ótima! Para você continuar cuidando da sua saúde de forma preventiva, preparamos um presente:</p>
    <div style="background:#F6E7E1;border:2px dashed #7B1E3C;padding:20px;margin:20px 0;border-radius:10px;text-align:center;">
      <p style="margin:0;color:#7B1E3C;font-size:15px;">Desconto exclusivo</p>
      <p style="margin:6px 0;font-size:34px;font-weight:800;color:#7B1E3C;">${discountPercent}% OFF</p>
      <p style="margin:0;font-size:13px;color:#6B5B62;">no plano que você escolher · use o código</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:800;letter-spacing:2px;color:#1f2937;">${discountCode}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${link}" style="display:inline-block;background:#7B1E3C;color:white;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;">Escolher meu plano com ${discountPercent}%</a>
    </div>
    <p style="color:#6B5B62;font-size:13px;">O desconto é aplicado automaticamente ao concluir sua inscrição por este link.</p>`;
  return sendEmail(patientEmail, `Seu presente vivas: ${discountPercent}% de desconto no plano`, emailShell('Convite para assinar', 'Bem-vindo(a) à vivas', inner));
}

module.exports = {
  checkAndNotify, classifyIndicator, THRESHOLDS, sendEmail,
  getIndicatorHistory, computeComparativeAnalysis, sendComparativeReport,
  sendInvitePatientEmail, sendPostConsultDiscountEmail,
  getTransporter, getFromAddress, sendRawEmail,
};
