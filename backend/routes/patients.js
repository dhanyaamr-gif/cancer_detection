const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patientController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET /api/patients
router.get('/', getPatients);

// POST /api/patients
router.post('/', createPatient);

// GET /api/patients/:id
router.get('/:id', getPatient);

// PUT /api/patients/:id
router.put('/:id', updatePatient);

// DELETE /api/patients/:id
router.delete('/:id', deletePatient);

module.exports = router;

