const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate, authorize } = require('./auth');

const router = express.Router();
const MEDICAL_ROLES = ['admin', 'medico', 'enfermeiro', 'psicologo', 'fisioterapeuta'];

// Configure storage for DICOM files
const DICOM_DIR = process.env.DICOM_STORAGE_PATH || path.join(__dirname, '../../dicom_storage');
if (!fs.existsSync(DICOM_DIR)) {
  fs.mkdirSync(DICOM_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const studyDir = path.join(DICOM_DIR, req.params.studyId || 'uploads');
    if (!fs.existsSync(studyDir)) fs.mkdirSync(studyDir, { recursive: true });
    cb(null, studyDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.dcm', '.dicom', '.zip', '.gz', '.nii', ''];
    if (allowed.includes(ext) || file.mimetype === 'application/dicom' || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Formato não suportado. Use arquivos DICOM (.dcm) ou ZIP.'));
    }
  },
});

// GET /api/dicom/studies - List all studies
router.get('/studies', authenticate, authorize(...MEDICAL_ROLES), async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM dicom_studies ORDER BY study_date DESC, created_at DESC`;
    let params = [];
    if (search) {
      query = `SELECT * FROM dicom_studies 
               WHERE patient_name ILIKE $1 OR patient_id ILIKE $1 OR study_description ILIKE $1 OR modality ILIKE $1
               ORDER BY study_date DESC, created_at DESC`;
      params = [`%${search}%`];
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dicom/studies/:id - Get study with series
router.get('/studies/:id', authenticate, authorize(...MEDICAL_ROLES), async (req, res) => {
  try {
    const study = await pool.query('SELECT * FROM dicom_studies WHERE id = $1', [req.params.id]);
    if (study.rows.length === 0) return res.status(404).json({ error: 'Estudo não encontrado' });
    const series = await pool.query('SELECT * FROM dicom_series WHERE study_id = $1 ORDER BY series_number', [req.params.id]);
    const instances = await pool.query(
      `SELECT di.* FROM dicom_instances di 
       JOIN dicom_series ds ON di.series_id = ds.id 
       WHERE ds.study_id = $1 ORDER BY di.instance_number`,
      [req.params.id]
    );
    res.json({ ...study.rows[0], series: series.rows, instances: instances.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dicom/upload - Upload DICOM files
router.post('/upload', authenticate, authorize(...MEDICAL_ROLES), upload.array('files', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const results = [];
    for (const file of req.files) {
      // Try to parse DICOM metadata
      let metadata = {};
      try {
        const dicomParser = require('dicom-parser');
        const buffer = fs.readFileSync(file.path);
        const dataSet = dicomParser.parseDicom(buffer);

        metadata = {
          patient_name: getStringTag(dataSet, 'x00100010'),
          patient_id: getStringTag(dataSet, 'x00100020'),
          patient_birth_date: getStringTag(dataSet, 'x00100030'),
          patient_sex: getStringTag(dataSet, 'x00100040'),
          study_instance_uid: getStringTag(dataSet, 'x0020000d'),
          study_date: getStringTag(dataSet, 'x00080020'),
          study_time: getStringTag(dataSet, 'x00080030'),
          study_description: getStringTag(dataSet, 'x00081030'),
          accession_number: getStringTag(dataSet, 'x00080050'),
          modality: getStringTag(dataSet, 'x00080060'),
          series_instance_uid: getStringTag(dataSet, 'x0020000e'),
          series_number: getStringTag(dataSet, 'x00200011'),
          series_description: getStringTag(dataSet, 'x0008103e'),
          sop_instance_uid: getStringTag(dataSet, 'x00080018'),
          instance_number: getStringTag(dataSet, 'x00200013'),
          rows: dataSet.uint16('x00280010'),
          columns: dataSet.uint16('x00280011'),
          bits_allocated: dataSet.uint16('x00280100'),
          bits_stored: dataSet.uint16('x00280101'),
          pixel_spacing: getStringTag(dataSet, 'x00280030'),
          slice_thickness: getStringTag(dataSet, 'x00180050'),
          window_center: getStringTag(dataSet, 'x00281050'),
          window_width: getStringTag(dataSet, 'x00281051'),
          rescale_intercept: getStringTag(dataSet, 'x00281052'),
          rescale_slope: getStringTag(dataSet, 'x00281053'),
          photometric_interpretation: getStringTag(dataSet, 'x00280004'),
          transfer_syntax_uid: getStringTag(dataSet, 'x00020010'),
        };
      } catch {
        // File may be ZIP or non-standard DICOM
        metadata.patient_name = 'Importação Pendente';
        metadata.modality = 'OT';
      }

      // Create or find study
      let studyId;
      if (metadata.study_instance_uid) {
        const existing = await pool.query(
          'SELECT id FROM dicom_studies WHERE study_instance_uid = $1',
          [metadata.study_instance_uid]
        );
        if (existing.rows.length > 0) {
          studyId = existing.rows[0].id;
        } else {
          const studyResult = await pool.query(
            `INSERT INTO dicom_studies (study_instance_uid, patient_name, patient_id, patient_birth_date, patient_sex,
             study_date, study_time, study_description, accession_number, modality)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
            [metadata.study_instance_uid, metadata.patient_name, metadata.patient_id,
             metadata.patient_birth_date, metadata.patient_sex, metadata.study_date,
             metadata.study_time, metadata.study_description, metadata.accession_number,
             metadata.modality]
          );
          studyId = studyResult.rows[0].id;
        }
      } else {
        const studyResult = await pool.query(
          `INSERT INTO dicom_studies (study_instance_uid, patient_name, modality, study_description)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [`local-${Date.now()}`, metadata.patient_name || 'Desconhecido', metadata.modality || 'OT', 'Upload Local']
        );
        studyId = studyResult.rows[0].id;
      }

      // Create or find series
      let seriesId;
      if (metadata.series_instance_uid) {
        const existingSeries = await pool.query(
          'SELECT id FROM dicom_series WHERE series_instance_uid = $1',
          [metadata.series_instance_uid]
        );
        if (existingSeries.rows.length > 0) {
          seriesId = existingSeries.rows[0].id;
        } else {
          const seriesResult = await pool.query(
            `INSERT INTO dicom_series (study_id, series_instance_uid, series_number, series_description, modality)
             VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [studyId, metadata.series_instance_uid, metadata.series_number,
             metadata.series_description, metadata.modality]
          );
          seriesId = seriesResult.rows[0].id;
        }
      } else {
        const seriesResult = await pool.query(
          `INSERT INTO dicom_series (study_id, series_instance_uid, modality)
           VALUES ($1, $2, $3) RETURNING id`,
          [studyId, `local-series-${Date.now()}`, metadata.modality || 'OT']
        );
        seriesId = seriesResult.rows[0].id;
      }

      // Create instance record
      const instanceResult = await pool.query(
        `INSERT INTO dicom_instances (series_id, sop_instance_uid, instance_number, file_path,
         rows, columns, bits_allocated, bits_stored, pixel_spacing, slice_thickness,
         window_center, window_width, rescale_intercept, rescale_slope,
         photometric_interpretation, transfer_syntax_uid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
        [seriesId, metadata.sop_instance_uid || `local-${Date.now()}`,
         metadata.instance_number, file.path,
         metadata.rows, metadata.columns, metadata.bits_allocated, metadata.bits_stored,
         metadata.pixel_spacing, metadata.slice_thickness,
         metadata.window_center, metadata.window_width,
         metadata.rescale_intercept, metadata.rescale_slope,
         metadata.photometric_interpretation, metadata.transfer_syntax_uid]
      );

      // Update series image count
      await pool.query(
        `UPDATE dicom_series SET num_instances = (SELECT COUNT(*) FROM dicom_instances WHERE series_id = $1) WHERE id = $1`,
        [seriesId]
      );

      results.push({
        instanceId: instanceResult.rows[0].id,
        studyId,
        seriesId,
        patientName: metadata.patient_name,
        modality: metadata.modality,
        filename: file.originalname,
      });
    }

    res.json({ message: `${results.length} arquivo(s) importado(s)`, results });
  } catch (err) {
    console.error('DICOM upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dicom/file/:instanceId - Serve raw DICOM file
router.get('/file/:instanceId', authenticate, authorize(...MEDICAL_ROLES), async (req, res) => {
  try {
    const result = await pool.query('SELECT file_path FROM dicom_instances WHERE id = $1', [req.params.instanceId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Arquivo não encontrado' });
    const filePath = result.rows[0].file_path;
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(DICOM_DIR))) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    if (!fs.existsSync(resolvedPath)) return res.status(404).json({ error: 'Arquivo não disponível no disco' });
    res.setHeader('Content-Type', 'application/dicom');
    fs.createReadStream(resolvedPath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dicom/series/:seriesId/instances - Get all instances in a series
router.get('/series/:seriesId/instances', authenticate, authorize(...MEDICAL_ROLES), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM dicom_instances WHERE series_id = $1 ORDER BY instance_number',
      [req.params.seriesId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dicom/studies/:id - Delete study and all related data
router.delete('/studies/:id', authenticate, authorize(...MEDICAL_ROLES), async (req, res) => {
  try {
    // Get all file paths
    const instances = await pool.query(
      `SELECT di.file_path FROM dicom_instances di
       JOIN dicom_series ds ON di.series_id = ds.id
       WHERE ds.study_id = $1`,
      [req.params.id]
    );

    // Delete files from disk
    for (const inst of instances.rows) {
      if (inst.file_path && fs.existsSync(inst.file_path)) {
        fs.unlinkSync(inst.file_path);
      }
    }

    // Delete DB records (cascade)
    await pool.query('DELETE FROM dicom_studies WHERE id = $1', [req.params.id]);
    res.json({ message: 'Estudo removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dicom/pacs/sources - Get configured PACS sources
router.get('/pacs/sources', authenticate, authorize(...MEDICAL_ROLES), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dicom_pacs_sources ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dicom/pacs/sources - Add PACS source
router.post('/pacs/sources', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, ae_title, host, port, protocol, description } = req.body;
    const result = await pool.query(
      `INSERT INTO dicom_pacs_sources (name, ae_title, host, port, protocol, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, ae_title, host, port || 104, protocol || 'DIMSE', description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/dicom/pacs/sources/:id
router.delete('/pacs/sources/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM dicom_pacs_sources WHERE id = $1', [req.params.id]);
    res.json({ message: 'Fonte PACS removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getStringTag(dataSet, tag) {
  try {
    const val = dataSet.string(tag);
    return val ? val.trim() : null;
  } catch {
    return null;
  }
}

module.exports = router;
