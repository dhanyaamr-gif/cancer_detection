const express = require('express');
const router = express.Router();
const { login, logout, getProfile, updateProfile } = require('../controllers/authController');
const auth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', auth, logout);

// GET /api/auth/profile
router.get('/profile', auth, getProfile);

// PUT /api/auth/profile
router.put('/profile', auth, updateProfile);

module.exports = router;

