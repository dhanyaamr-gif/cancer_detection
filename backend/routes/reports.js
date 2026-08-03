const express = require('express');
const router = express.Router();
const {
  getReports,
  getReport,
  createReport,
  downloadPDF,
  downloadDICOM,
} = require('../controllers/reportController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET /api/reports
router.get('/', getReports);

// POST /api/reports
router.post('/', createReport);

// GET /api/reports/:id
router.get('/:id', getReport);

// POST /api/reports/:id/download-pdf
router.post('/:id/download-pdf', downloadPDF);

// POST /api/reports/:id/download-dicom
router.post('/:id/download-dicom', downloadDICOM);

module.exports = router;

