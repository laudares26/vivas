require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const seedData = async () => {
  try {
    // Seed default users
    const adminHash = await bcrypt.hash('admin123', 10);
    const medicoHash = await bcrypt.hash('medico123', 10);
    const pacienteHash = await bcrypt.hash('paciente123', 10);
    const marketingHash = await bcrypt.hash('marketing123', 10);
    const psicologoHash = await bcrypt.hash('psicologo123', 10);

    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role, avatar_color)
      VALUES 
        ('admin@vivas.com', $1, 'Dr. Admin', 'admin', '#0057B8'),
        ('bruno.hodos@gmail.com', $2, 'Dr. Bruno Hodos', 'medico', '#2563EB'),
        ('maria@email.com', $3, 'Maria Silva Santos', 'paciente', '#EA580C'),
        ('brunocorreafotografo@gmail.com', $3, 'Bruno Correa', 'paciente', '#F59E0B'),
        ('marketing@vivas.com', $4, 'Ana Marketing', 'marketing_admin', '#9333EA'),
        ('psicologa@vivas.com', $5, 'Dra. Carla Sousa', 'psicologo', '#EC4899')
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash, medicoHash, pacienteHash, marketingHash, psicologoHash]);

    // Seed patients
    await pool.query(`
      INSERT INTO patients (full_name, cpf, cns, birth_date, gender, phone, email, address_city, address_state, blood_type, allergies, convenio, status)
      VALUES 
        ('Maria Silva Santos', '123.456.789-00', '898 0001 2345 0001', '1985-03-15', 'Feminino', '(31) 99999-1111', 'maria.silva@email.com', 'Belo Horizonte', 'MG', 'O+', 'Penicilina', 'SUS', 'Ativo'),
        ('João Carlos Oliveira', '234.567.890-11', '898 0001 2345 0002', '1972-08-22', 'Masculino', '(31) 99999-2222', 'joao.oliveira@email.com', 'Belo Horizonte', 'MG', 'A+', NULL, 'SUS', 'Ativo'),
        ('Ana Paula Ferreira', '345.678.901-22', '898 0001 2345 0003', '1990-11-10', 'Feminino', '(31) 99999-3333', 'ana.ferreira@email.com', 'Contagem', 'MG', 'B+', 'Dipirona, Látex', 'Unimed', 'Ativo'),
        ('Carlos Eduardo Lima', '456.789.012-33', '898 0001 2345 0004', '1968-05-30', 'Masculino', '(31) 99999-4444', 'carlos.lima@email.com', 'Betim', 'MG', 'AB+', NULL, 'SUS', 'Em atendimento'),
        ('Fernanda Costa Ribeiro', '567.890.123-44', '898 0001 2345 0005', '1995-01-18', 'Feminino', '(31) 99999-5555', 'fernanda.ribeiro@email.com', 'Belo Horizonte', 'MG', 'O-', 'Sulfa', 'SUS', 'Ativo'),
        ('Pedro Henrique Souza', '678.901.234-55', '898 0001 2345 0006', '1980-07-05', 'Masculino', '(31) 99999-6666', 'pedro.souza@email.com', 'Nova Lima', 'MG', 'A-', NULL, 'Bradesco Saúde', 'Ativo'),
        ('Lucia Helena Martins', '789.012.345-66', '898 0001 2345 0007', '1955-12-20', 'Feminino', '(31) 99999-7777', 'lucia.martins@email.com', 'Belo Horizonte', 'MG', 'B-', 'AAS', 'SUS', 'Ativo'),
        ('Roberto Santos Neto', '890.123.456-77', '898 0001 2345 0008', '1978-09-14', 'Masculino', '(31) 99999-8888', 'roberto.neto@email.com', 'Sabará', 'MG', 'O+', NULL, 'SUS', 'Ativo'),
        ('Camila Rodrigues Alves', '901.234.567-88', '898 0001 2345 0009', '2000-04-25', 'Feminino', '(31) 99999-9999', 'camila.alves@email.com', 'Belo Horizonte', 'MG', 'A+', NULL, 'Unimed', 'Ativo'),
        ('Marcos Vinícius Pereira', '012.345.678-99', '898 0001 2345 0010', '1988-06-08', 'Masculino', '(31) 99999-0000', 'marcos.pereira@email.com', 'Ibirité', 'MG', 'AB-', 'Ibuprofeno', 'SUS', 'Ativo')
      ON CONFLICT (cpf) DO NOTHING;
    `);

    // Seed professionals (added Psicólogo)
    await pool.query(`
      INSERT INTO professionals (full_name, cpf, professional_id, category, specialty, cnes, phone, email, schedule, consultations_month, rating)
      VALUES
        ('Dr. Bruno Hodos', '111.222.333-44', 'CRM-MG 12345', 'Médico', 'Clínica Geral', '7891023', '(31) 98888-1111', 'bruno.hodos@gmail.com', 'Seg-Sex', 180, 4.9),
        ('Dra. Patrícia Gomes', '222.333.444-55', 'CRM-MG 23456', 'Médico', 'Cardiologia', '7891023', '(31) 98888-2222', 'dra.patricia@vivas.com', 'Seg-Qui', 145, 4.8),
        ('Dr. Antônio Almeida', '333.444.555-66', 'CRM-MG 34567', 'Médico', 'Pediatria', '7891023', '(31) 98888-3333', 'dr.antonio@vivas.com', 'Ter-Sáb', 210, 4.7),
        ('Dra. Juliana Barros', '444.555.666-77', 'CRM-MG 45678', 'Médico', 'Ginecologia', '7891023', '(31) 98888-4444', 'dra.juliana@vivas.com', 'Seg-Sex', 160, 4.9),
        ('Dra. Carla Sousa', '999.111.222-33', 'CRP-MG 12345', 'Psicólogo', 'Psicologia Clínica', '7891023', '(31) 98888-9999', 'psicologa@vivas.com', 'Seg-Sex', 120, 4.9)
      ON CONFLICT (cpf) DO NOTHING;
    `);

    // Get IDs for relationships
    const patients = await pool.query('SELECT id, full_name FROM patients ORDER BY full_name LIMIT 10');
    const professionals = await pool.query('SELECT id, full_name, category FROM professionals ORDER BY full_name LIMIT 9');

    if (patients.rows.length > 0 && professionals.rows.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Seed appointments
      for (let i = 0; i < Math.min(patients.rows.length, 8); i++) {
        const apptDate = new Date(today);
        apptDate.setDate(apptDate.getDate() + Math.floor(Math.random() * 14));
        apptDate.setHours(8 + Math.floor(Math.random() * 10), Math.random() > 0.5 ? 0 : 30, 0, 0);
        
        const types = ['Consulta', 'Retorno', 'Exame', 'Procedimento'];
        const statuses = ['agendado', 'confirmado', 'em_atendimento', 'concluido'];
        
        await pool.query(`
          INSERT INTO appointments (patient_id, professional_id, date_time, type, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          patients.rows[i].id,
          professionals.rows[i % professionals.rows.length].id,
          apptDate.toISOString(),
          types[i % types.length],
          statuses[i % statuses.length],
          'Consulta de rotina'
        ]);
      }

      // Seed medical records
      const medProfs = professionals.rows.filter(p => p.category === 'Médico');
      for (let i = 0; i < Math.min(patients.rows.length, 5); i++) {
        const manchesterColors = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];
        const icd10Codes = ['J06.9', 'I10', 'E11.9', 'M54.5', 'K29.7'];
        const icd10Descs = ['IVAS', 'Hipertensão arterial', 'Diabetes mellitus tipo 2', 'Lombalgia', 'Gastrite'];
        
        await pool.query(`
          INSERT INTO medical_records (patient_id, professional_id, chief_complaint, manchester_priority, 
            systolic_bp, diastolic_bp, heart_rate, temperature, respiratory_rate, spo2, weight, height,
            icd10_code, icd10_description, diagnosis, conduct)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          patients.rows[i].id,
          medProfs[i % medProfs.length].id,
          'Dor de cabeça persistente há 3 dias',
          manchesterColors[i],
          120 + Math.floor(Math.random() * 30),
          70 + Math.floor(Math.random() * 20),
          60 + Math.floor(Math.random() * 40),
          36.0 + Math.random() * 2.5,
          14 + Math.floor(Math.random() * 8),
          94 + Math.floor(Math.random() * 6),
          60 + Math.floor(Math.random() * 40),
          1.55 + Math.random() * 0.35,
          icd10Codes[i],
          icd10Descs[i],
          'Paciente apresenta quadro de ' + icd10Descs[i],
          'Medicação prescrita e orientações de repouso'
        ]);
      }

      // Seed triage records
      const manchesterColors = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];
      const triageStatuses = ['aguardando', 'em_atendimento', 'aguardando', 'atendido', 'aguardando'];
      for (let i = 0; i < 5; i++) {
        await pool.query(`
          INSERT INTO triage_records (patient_id, manchester_color, symptoms, ai_assessment, priority_score, wait_time_minutes, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          patients.rows[i].id,
          manchesterColors[i],
          'Sintomas reportados pelo paciente durante triagem',
          'Avaliação IA: classificação baseada em protocolo Manchester',
          (5 - i),
          i * 15,
          triageStatuses[i]
        ]);
      }

      // Seed prescriptions
      for (let i = 0; i < 3; i++) {
        const presResult = await pool.query(`
          INSERT INTO prescriptions (patient_id, professional_id, status)
          VALUES ($1, $2, 'ativa') RETURNING id
        `, [patients.rows[i].id, medProfs[i % medProfs.length].id]);

        const medications = [
          { name: 'Paracetamol 750mg', dosage: '1 comprimido', freq: '6/6h', dur: '5 dias', route: 'Oral', instr: 'Tomar após as refeições' },
          { name: 'Amoxicilina 500mg', dosage: '1 cápsula', freq: '8/8h', dur: '7 dias', route: 'Oral', instr: 'Tomar em jejum' },
          { name: 'Omeprazol 20mg', dosage: '1 cápsula', freq: '1x/dia', dur: '30 dias', route: 'Oral', instr: 'Tomar em jejum, 30min antes do café' },
        ];

        for (let j = 0; j <= i; j++) {
          const med = medications[j];
          await pool.query(`
            INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, route, instructions)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [presResult.rows[0].id, med.name, med.dosage, med.freq, med.dur, med.route, med.instr]);
        }
      }

      // Seed exams
      const loincCodes = ['2093-3', '2571-8', '718-7', '4548-4', '2345-7'];
      const examNames = ['Colesterol Total', 'Triglicerídeos', 'Hemoglobina', 'Hemoglobina Glicada', 'Glicose'];
      const examStatuses = ['solicitado', 'coletado', 'em_analise', 'concluido', 'concluido'];
      
      for (let i = 0; i < 5; i++) {
        await pool.query(`
          INSERT INTO exams (patient_id, professional_id, loinc_code, exam_name, category, status, result, ai_analysis)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          patients.rows[i].id,
          medProfs[i % medProfs.length].id,
          loincCodes[i],
          examNames[i],
          'Laboratorial',
          examStatuses[i],
          examStatuses[i] === 'concluido' ? '180 mg/dL' : null,
          examStatuses[i] === 'concluido' ? 'Valor dentro da faixa de atenção. Recomenda-se acompanhamento.' : null
        ]);
      }

      // Seed risk predictions
      for (let i = 0; i < 4; i++) {
        await pool.query(`
          INSERT INTO risk_predictions (patient_id, cardiovascular_risk, diabetes_risk, hypertension_risk, renal_risk, recommendations)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          patients.rows[i].id,
          15 + Math.random() * 60,
          10 + Math.random() * 50,
          20 + Math.random() * 55,
          5 + Math.random() * 40,
          'Recomenda-se atividade física regular, dieta balanceada e acompanhamento médico periódico.'
        ]);
      }

      // Seed EHR entries
      const entryTypes = ['consulta', 'exame', 'medicamento', 'vacina', 'alergia'];
      const titles = ['Consulta Clínica Geral', 'Hemograma Completo', 'Início de Losartana', 'Vacina Influenza', 'Alergia a Penicilina registrada'];
      
      for (let i = 0; i < 5; i++) {
        const entryDate = new Date(today);
        entryDate.setDate(entryDate.getDate() - (i * 30));
        
        await pool.query(`
          INSERT INTO ehr_entries (patient_id, entry_type, title, description, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          patients.rows[0].id,
          entryTypes[i],
          titles[i],
          'Registro de ' + titles[i] + ' no prontuário eletrônico do paciente.',
          JSON.stringify({ professional: medProfs[0].full_name }),
          entryDate.toISOString()
        ]);
      }

      // Seed coupons
      await pool.query(`
        INSERT INTO coupons (code, campaign, discount, redemptions, max_redemptions, valid_until, status)
        VALUES
          ('VIVAS30', 'Campanha Instagram Março', '30%', 1234, 2000, '2026-03-31', 'Ativo'),
          ('TIKTOK25', 'TikTok Viral', 'Exame Grátis', 897, 1500, '2026-04-15', 'Ativo'),
          ('SAUDE10', 'Email Marketing', '10%', 456, 500, '2026-03-25', 'Quase esgotado'),
          ('FB20OFF', 'Facebook Ads', '20%', 78, 300, '2026-04-30', 'Ativo'),
          ('AMIG015', 'Indicação (Referral)', '15%', 312, NULL, NULL, 'Ativo'),
          ('JANE1R020', 'Campanha Janeiro', '20%', 2100, 2000, '2026-01-31', 'Expirado')
        ON CONFLICT (code) DO NOTHING;
      `);
    }

    // Seed professional-patient relationships for data isolation
    const profUsers = await pool.query(
      "SELECT id, role FROM users WHERE role IN ('medico', 'psicologo') AND active = true"
    );
    const patientUsers = await pool.query(
      "SELECT id FROM users WHERE role = 'paciente' AND active = true"
    );
    if (profUsers.rows.length > 0 && patientUsers.rows.length > 0) {
      for (const prof of profUsers.rows) {
        for (const pat of patientUsers.rows) {
          await pool.query(
            `INSERT INTO professional_patient_relationships (professional_user_id, patient_user_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [prof.id, pat.id]
          );
        }
      }
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seedData();
