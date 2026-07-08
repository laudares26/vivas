require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seedCompany() {
  try {
    console.log('Seeding demo company and RH user...');

    // 1. Create demo company
    const companyResult = await pool.query(
      `INSERT INTO companies (name, cnpj, trade_name, sector, employee_count, contact_email, contact_phone, address_city, address_state)
       VALUES ('TechCorp Brasil Ltda', '12.345.678/0001-99', 'TechCorp', 'Tecnologia', 120, 'rh@techcorp.com.br', '(31) 3333-4444', 'Belo Horizonte', 'MG')
       ON CONFLICT (cnpj) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const companyId = companyResult.rows[0].id;
    console.log('Company created:', companyId);

    // 2. Create RH user
    const rhPassword = await bcrypt.hash('rh12345', 10);
    const rhResult = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, avatar_color, company_id)
       VALUES ('rh@techcorp.com.br', $1, 'Ana Paula Silva', 'rh', '#5E1730', $2)
       ON CONFLICT (email) DO UPDATE SET role = 'rh', company_id = $2
       RETURNING id`,
      [rhPassword, companyId]
    );
    const rhUserId = rhResult.rows[0].id;
    console.log('RH user created:', rhUserId);

    // 3. Link RH user to company
    await pool.query(
      `INSERT INTO company_employees (company_id, user_id, role, department, job_title)
       VALUES ($1, $2, 'rh', 'Recursos Humanos', 'Gerente de RH')
       ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'rh'`,
      [companyId, rhUserId]
    );

    // 4. Link Bruno Correa (paciente) as employee of TechCorp
    const brunoResult = await pool.query(
      `SELECT id FROM users WHERE email = 'brunocorreafotografo@gmail.com'`
    );
    if (brunoResult.rows.length > 0) {
      const brunoId = brunoResult.rows[0].id;
      await pool.query(
        `UPDATE users SET company_id = $1 WHERE id = $2`,
        [companyId, brunoId]
      );
      await pool.query(
        `INSERT INTO company_employees (company_id, user_id, role, department, job_title)
         VALUES ($1, $2, 'employee', 'Marketing', 'Fotógrafo')
         ON CONFLICT (company_id, user_id) DO UPDATE SET department = 'Marketing', job_title = 'Fotógrafo'`,
        [companyId, brunoId]
      );
      console.log('Bruno Correa linked to TechCorp as employee');
    }

    // 5. Create a few more demo employees
    const demoEmployees = [
      { name: 'Carlos Eduardo Mendes', email: 'carlos.mendes@techcorp.com.br', dept: 'Engenharia', title: 'Desenvolvedor Senior' },
      { name: 'Fernanda Oliveira', email: 'fernanda.oliveira@techcorp.com.br', dept: 'Produto', title: 'Product Manager' },
      { name: 'Rafael Santos Costa', email: 'rafael.costa@techcorp.com.br', dept: 'Comercial', title: 'Executivo de Vendas' },
    ];

    for (const emp of demoEmployees) {
      const empPassword = await bcrypt.hash('vivas2026', 10);
      const empResult = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, avatar_color, company_id)
         VALUES ($1, $2, $3, 'paciente', '#7B1E3C', $4)
         ON CONFLICT (email) DO UPDATE SET company_id = $4
         RETURNING id`,
        [emp.email, empPassword, emp.name, companyId]
      );
      await pool.query(
        `INSERT INTO company_employees (company_id, user_id, role, department, job_title)
         VALUES ($1, $2, 'employee', $3, $4)
         ON CONFLICT (company_id, user_id) DO UPDATE SET department = $3, job_title = $4`,
        [companyId, empResult.rows[0].id, emp.dept, emp.title]
      );
      console.log(`Employee ${emp.name} created`);
    }

    console.log('\nDemo company seed complete!');
    console.log('RH Login: rh@techcorp.com.br / rh12345');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seedCompany();
