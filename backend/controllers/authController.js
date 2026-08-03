const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Settings = require('../models/Settings');

/**
 * POST /api/auth/login
 * Authenticate doctor and return JWT token
 */
const login = async (req, res, next) => {
  try {
    const { email, password, doctorId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find doctor by email or doctorId
    const doctor = await Doctor.findOne({
      $or: [{ email: email.toLowerCase() }, { doctorId: doctorId || '' }],
    }).select('+password');

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: doctor._id, doctorId: doctor.doctorId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Ensure default settings exist
    const existingSettings = await Settings.findOne({ doctorId: doctor._id });
    if (!existingSettings) {
      await Settings.create({ doctorId: doctor._id });
    }

    res.json({
      success: true,
      token,
      doctor: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        avatar: doctor.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Logout - client-side token removal
 */
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * GET /api/auth/profile
 * Get current doctor's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    // Get stats
    const Scan = require('../models/Scan');
    const Report = require('../models/Report');
    const Patient = require('../models/Patient');

    const [patientsDiagnosed, reportsGenerated, scans] = await Promise.all([
      Patient.countDocuments({ doctorId: req.doctorId }),
      Report.countDocuments({ doctorId: req.doctorId }),
      Scan.find({ doctorId: req.doctorId }).sort({ createdAt: -1 }).limit(100),
    ]);

    const averageConfidence =
      scans.length > 0
        ? Math.round(
            scans.reduce((sum, s) => sum + (s.prediction?.confidence || 0), 0) /
              scans.length
          )
        : 0;

    res.json({
      success: true,
      doctor: {
        id: doctor._id,
        doctorId: doctor.doctorId,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        department: doctor.department,
        experience: doctor.experience,
        qualifications: doctor.qualifications,
        license: doctor.license,
        phone: doctor.phone,
        avatar: doctor.avatar,
        patientsDiagnosed,
        reportsGenerated,
        averageConfidence,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 * Update doctor's profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'name',
      'specialization',
      'hospital',
      'department',
      'experience',
      'phone',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const doctor = await Doctor.findByIdAndUpdate(req.doctorId, updates, {
      new: true,
      runValidators: true,
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found.',
      });
    }

    res.json({
      success: true,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, logout, getProfile, updateProfile };

