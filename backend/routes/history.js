const express = require('express');
const router = express.Router();
const { getHistory } = require('../controllers/historyController');
const auth = require('../middleware/auth');

// GET /api/history
router.get('/', auth, getHistory);

module.exports = router;

