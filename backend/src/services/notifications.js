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
    from: process.env.SMTP_FROM || '"VIVAS Saúde" <notificacoes@vivas.digital>',
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
          <p style="margin: 0; font-size: 13px;"><strong>Apoio Preventivo IA:</strong> Estes dados são suporte preventivo e não constituem diagnóstico médico. Consulte seu profissional de saúde para orientações clínicas.</p>
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
      `🔔 VIVAS — Alerta de paciente: ${patient.full_name}`,
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

module.exports = { checkAndNotify, classifyIndicator, THRESHOLDS, sendEmail };
