const router = require('express').Router();
const pool = require('../config/database');

router.get('/', async (req, res) => {
  try {
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

    res.json({
      kpis: {
        totalPatients: parseInt(patients.rows[0].count),
        totalProfessionals: parseInt(professionals.rows[0].count),
        appointmentsToday: parseInt(appointmentsToday.rows[0].count),
        triageQueue: parseInt(triageQueue.rows[0].count),
      },
      upcomingAppointments: recentAppointments.rows,
      specialtyStats: specialtyStats.rows,
      manchesterStats: manchesterStats.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
