require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter, authenticate } = require('./routes/auth');
const patientsRouter = require('./routes/patients');
const professionalsRouter = require('./routes/professionals');
const appointmentsRouter = require('./routes/appointments');
const medicalRecordsRouter = require('./routes/medicalRecords');
const prescriptionsRouter = require('./routes/prescriptions');
const examsRouter = require('./routes/exams');
const ehrRouter = require('./routes/ehr');
const triageRouter = require('./routes/triage');
const riskRouter = require('./routes/risk');
const dashboardRouter = require('./routes/dashboard');
const couponsRouter = require('./routes/coupons');
const dicomRouter = require('./routes/dicom');
const preventiveHealthRouter = require('./routes/preventiveHealth');
const subscriptionsRouter = require('./routes/subscriptions');
const companiesRouter = require('./routes/companies');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Stripe webhook needs raw body
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/patients', authenticate, patientsRouter);
app.use('/api/professionals', authenticate, professionalsRouter);
app.use('/api/appointments', authenticate, appointmentsRouter);
app.use('/api/medical-records', authenticate, medicalRecordsRouter);
app.use('/api/prescriptions', authenticate, prescriptionsRouter);
app.use('/api/exams', authenticate, examsRouter);
app.use('/api/ehr', authenticate, ehrRouter);
app.use('/api/triage', authenticate, triageRouter);
app.use('/api/risk', authenticate, riskRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/coupons', authenticate, couponsRouter);
app.use('/api/dicom', dicomRouter); // DICOM routes handle their own auth + role checks
app.use('/api/preventive-health', preventiveHealthRouter); // handles own auth
app.use('/api/subscriptions', subscriptionsRouter); // handles own auth per route
app.use('/api/companies', companiesRouter); // handles own auth per route

// Serve institutional site for vivasaudeinteligente.com.br
const INSTITUTIONAL_HOSTS = ['vivasaudeinteligente.com.br', 'www.vivasaudeinteligente.com.br'];
const institutionalDir = path.join(__dirname, '../../institutional');

app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (INSTITUTIONAL_HOSTS.includes(host) && !req.path.startsWith('/api/')) {
    // Serve /empresas page
    if (req.path === '/empresas' || req.path === '/empresas/') {
      return res.sendFile(path.join(institutionalDir, 'empresas.html'));
    }
    // Serve /mental page
    if (req.path === '/mental' || req.path === '/mental/') {
      return res.sendFile(path.join(institutionalDir, 'mental.html'));
    }
    // Serve /cotacao page
    if (req.path === '/cotacao' || req.path === '/cotacao/') {
      return res.sendFile(path.join(institutionalDir, 'cotacao.html'));
    }
    express.static(institutionalDir)(req, res, () => {
      res.sendFile(path.join(institutionalDir, 'index.html'));
    });
  } else {
    next();
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VIVAS API running on port ${PORT}`);
});
