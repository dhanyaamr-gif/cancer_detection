const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET /api/settings
router.get('/', getSettings);

// PUT /api/settings
router.put('/', updateSettings);

module.exports = router;

