const express = require('express');
const router = express.Router();
const { uploadScan, getScan, getPatientScans } = require('../controllers/scanController');
const auth = require('../middleware/auth');
const { uploadScan: uploadMiddleware } = require('../middleware/upload');

// All routes require authentication
router.use(auth);

// POST /api/scans/upload - supports single file (field: 'image') or multiple files (field: 'images')
router.post('/upload', (req, res, next) => {
  // Support both 'image' (single) and 'images' (multiple) field names
  const upload = uploadMiddleware.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 20 },
  ]);
  upload(req, res, (err) => {
    if (err) return next(err);
    // Normalize: combine single and multiple into req.files
    if (req.file && !req.files) {
      req.files = [req.file];
    } else if (req.files) {
      // Flatten the files object into an array
      const allFiles = [];
      if (req.files.image) allFiles.push(...req.files.image);
      if (req.files.images) allFiles.push(...req.files.images);
      req.files = allFiles;
    }
    next();
  });
}, uploadScan);

// GET /api/scans/:id
router.get('/:id', getScan);

// GET /api/patients/:id/scans (also accessible via patients route)
router.get('/patient/:id', getPatientScans);

module.exports = router;

