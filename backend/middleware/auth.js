const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const doctor = await Doctor.findById(decoded.id);
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Doctor not found.',
      });
    }

    req.doctor = doctor;
    req.doctorId = doctor._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

module.exports = auth;

