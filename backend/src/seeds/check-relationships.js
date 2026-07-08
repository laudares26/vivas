require('dotenv').config();
const pool = require('../config/database');

async function run() {
  // Check relationships for Bruno Hodos
  const r = await pool.query(`
    SELECT ppr.*, u1.email as prof_email, u2.email as pat_email, u2.full_name as pat_name
    FROM professional_patient_relationships ppr 
    JOIN users u1 ON u1.id = ppr.professional_user_id 
    JOIN users u2 ON u2.id = ppr.patient_user_id 
    WHERE u1.email = 'bruno.hodos@gmail.com'
  `);
  console.log('Bruno Hodos relationships:', JSON.stringify(r.rows, null, 2));

  // Check how patients.email maps to users
  const p = await pool.query(`
    SELECT p.id, p.full_name, p.email 
    FROM patients p 
    WHERE p.email IN (
      SELECT u.email FROM users u 
      JOIN professional_patient_relationships ppr ON ppr.patient_user_id = u.id 
      WHERE ppr.professional_user_id = (SELECT id FROM users WHERE email = 'bruno.hodos@gmail.com')
    )
  `);
  console.log('Matching patients in patients table:', JSON.stringify(p.rows, null, 2));
  
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
