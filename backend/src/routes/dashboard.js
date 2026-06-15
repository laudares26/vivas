const router = require('express').Router();
const pool = require('../config/database');

const PROFESSIONAL_ROLES = ['medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'];

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userEmail = req.user.email;

    const [patients, professionals, appointmentsToday, triageQueue, recentAppointments, specialtyStats] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM patients WHERE active = true'),
      pool.query('SELECT COUNT(*) FROM professionals WHERE active = true'),
      pool.query("SELECT COUNT(*) FROM appointments WHERE DATE(date_time) = CURRENT_DATE"),
      pool.query("SELECT COUNT(*) FROM triage_records WHERE status IN ('aguardando', 'em_atendimento')"),
      pool.query(`SELECT a.*, p.full_name as patient_name, pr.full_name as professional_name, pr.specialty
                  FROM appointments a
                  LEFT JOIN patients p ON a.patient_id = p.id
                  LEFT JOIN professionals pr ON a.professional_id = pr.id
                  WHERE a.date_time >= NOW()
                  ORDER BY a.date_time ASC LIMIT 5`),
      pool.query(`SELECT pr.specialty, COUNT(*) as count
                  FROM appointments a
                  LEFT JOIN professionals pr ON a.professional_id = pr.id
                  WHERE pr.specialty IS NOT NULL
                  GROUP BY pr.specialty
                  ORDER BY count DESC LIMIT 6`),
    ]);

    const manchesterStats = await pool.query(`
      SELECT manchester_color, COUNT(*) as count
      FROM triage_records
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY manchester_color
    `);

    // Weekly attendance stats (last 7 days)
    const PT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weeklyRaw = await pool.query(`
      SELECT EXTRACT(DOW FROM date_time)::int as dow, COUNT(*) as count
      FROM appointments
      WHERE date_time >= NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(DOW FROM date_time)::int, DATE(date_time)
      ORDER BY DATE(date_time)
    `);
    const weeklyStats = { rows: weeklyRaw.rows.map(r => ({ day: PT_DAYS[r.dow] || r.dow, count: r.count })) };

    // Health alerts for this user
    let healthAlerts = { total: 0, unread: 0, recent: [] };
    try {
      if (PROFESSIONAL_ROLES.includes(userRole)) {
        // Professional: alerts from their patients
        const alertsResult = await pool.query(`
          SELECT hn.*, u.full_name as patient_name
          FROM health_notifications hn
          JOIN users u ON u.id = hn.patient_user_id
          JOIN professional_patient_relationships ppr ON ppr.patient_user_id = hn.patient_user_id
          WHERE ppr.professional_user_id = $1
          ORDER BY hn.created_at DESC LIMIT 10`, [userId]);
        const unreadResult = await pool.query(`
          SELECT COUNT(*) FROM health_notifications hn
          JOIN professional_patient_relationships ppr ON ppr.patient_user_id = hn.patient_user_id
          WHERE ppr.professional_user_id = $1 AND hn.read_by_professional = false`, [userId]);
        healthAlerts = {
          total: alertsResult.rows.length,
          unread: parseInt(unreadResult.rows[0].count),
          recent: alertsResult.rows.slice(0, 5),
        };
      } else if (userRole === 'paciente') {
        // Patient: their own alerts
        const alertsResult = await pool.query(`
          SELECT * FROM health_notifications WHERE patient_user_id = $1
          ORDER BY created_at DESC LIMIT 10`, [userId]);
        const unreadResult = await pool.query(`
          SELECT COUNT(*) FROM health_notifications
          WHERE patient_user_id = $1 AND read_by_patient = false`, [userId]);
        healthAlerts = {
          total: alertsResult.rows.length,
          unread: parseInt(unreadResult.rows[0].count),
          recent: alertsResult.rows.slice(0, 5),
        };
      }
    } catch (e) { /* health_notifications table may not exist yet */ }

    // Personal stats: total consultations done, last consultation
    let personalStats = { totalConsultations: 0, lastConsultation: null };
    try {
      if (PROFESSIONAL_ROLES.includes(userRole)) {
        // Professional: count appointments linked to their professional record
        const profResult = await pool.query(`
          SELECT COUNT(*) as total, MAX(date_time) as last_date
          FROM appointments a
          JOIN professionals pr ON a.professional_id = pr.id
          WHERE pr.email = $1 AND a.status IN ('concluido', 'em_atendimento', 'confirmado')`, [userEmail]);
        personalStats.totalConsultations = parseInt(profResult.rows[0].total) || 0;
        personalStats.lastConsultation = profResult.rows[0].last_date;
      } else if (userRole === 'paciente') {
        // Patient: their appointments
        const patResult = await pool.query(`
          SELECT COUNT(*) as total, MAX(date_time) as last_date
          FROM appointments a
          JOIN patients p ON a.patient_id = p.id
          WHERE p.email = $1`, [userEmail]);
        personalStats.totalConsultations = parseInt(patResult.rows[0].total) || 0;
        personalStats.lastConsultation = patResult.rows[0].last_date;
      }
    } catch (e) { /* ignore */ }

    res.json({
      kpis: {
        totalPatients: parseInt(patients.rows[0].count),
        totalProfessionals: parseInt(professionals.rows[0].count),
        appointmentsToday: parseInt(appointmentsToday.rows[0].count),
        triageQueue: parseInt(triageQueue.rows[0].count),
        satisfaction: 4.8,
      },
      upcomingAppointments: recentAppointments.rows,
      specialtyStats: specialtyStats.rows,
      manchesterStats: manchesterStats.rows,
      weeklyStats: weeklyStats.rows,
      healthAlerts,
      personalStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
