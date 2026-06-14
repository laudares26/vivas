require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/professionals', professionalsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/medical-records', medicalRecordsRouter);
app.use('/api/prescriptions', prescriptionsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/ehr', ehrRouter);
app.use('/api/triage', triageRouter);
app.use('/api/risk', riskRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/dicom', dicomRouter);

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
