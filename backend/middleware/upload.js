const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Allowed MIME types for medical images
const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/dicom',
];

// File filter to validate upload types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg', '.dcm'];
  
  if (allowedExts.includes(ext) || ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${ext}. Supported: PNG, JPG, JPEG, DICOM (.dcm)`
      ),
      false
    );
  }
};

// Storage configuration for scan uploads
const scanStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'scans'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Storage configuration for heatmap uploads
const heatmapStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'heatmaps'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `heatmap_${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Upload middleware for scan images (supports single and multiple)
const uploadScan = multer({
  storage: scanStorage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max per file for DICOM files
  },
});

// Upload middleware for heatmaps
const uploadHeatmap = multer({
  storage: heatmapStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for heatmaps
  },
});

module.exports = { uploadScan, uploadHeatmap };

