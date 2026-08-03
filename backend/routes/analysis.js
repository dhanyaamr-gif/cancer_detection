const express = require('express');
const router = express.Router();
const { analyzeScan, getAnalysis } = require('../controllers/analysisController');
const auth = require('../middleware/auth');

// POST /api/analyze
router.post('/', auth, analyzeScan);

// GET /api/analysis/:scanId - Return complete analysis data for a scan
router.get('/:scanId', auth, getAnalysis);

module.exports = router;
