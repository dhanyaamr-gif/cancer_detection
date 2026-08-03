const mongoose = require('mongoose');
const path = require('path');
const Patient = require('../models/Patient');
const Scan = require('../models/Scan');
const Report = require('../models/Report');
const AnalysisHistory = require('../models/AnalysisHistory');
const { generatePatientId } = require('../utils/helpers');

/**
 * Helper: Build query to find patient by either MongoDB _id or custom patientId string.
 * Avoids CastError by only using _id when the value is a valid ObjectId.
 */
function findPatientByIdOrPatientId(id, doctorId = null) {
  const query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query.$or = [{ _id: id }, { patientId: id }];
  } else {
    // Must be a custom patientId like "PT-1004"
    query.patientId = id;
  }
  if (doctorId) query.doctorId = doctorId;
  return query;
}

/**
 * GET /api/patients
 * Get all patients for the logged-in doctor
 */
const getPatients = async (req, res, next) => {
  try {
    const { search, status, cancerType, page = 1, limit = 20 } = req.query;

    let query = { doctorId: req.doctorId };

    // Search by name or patientId
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Attach latest scan info for each patient
    const patientsWithScans = await Promise.all(
      patients.map(async (patient) => {
        const latestScan = await Scan.findOne({ patientId: patient._id })
          .sort({ createdAt: -1 })
          .select('prediction scanType createdAt');

        return {
          ...patient.toObject(),
          latestScan: latestScan
            ? {
                confidence: latestScan.prediction?.confidence || 0,
                cancerType: latestScan.prediction?.prediction || '',
                scanType: latestScan.scanType,
                date: latestScan.createdAt,
                cancerDetected: latestScan.prediction?.cancerDetected || false,
              }
            : null,
        };
      })
    );

    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      patients: patientsWithScans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/patients/:id
 * Get single patient by ID (MongoDB _id or patientId)
 */
const getPatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find by MongoDB _id or custom patientId
    const patient = await Patient.findOne(findPatientByIdOrPatientId(id, req.doctorId));

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // Get all scans for this patient with full analysis data
    const scans = await Scan.find({ patientId: patient._id })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'name specialization');

    // Convert image paths to URLs for each scan
    const req_host = `${req.protocol}://${req.get('host')}`;
    const scansWithUrls = scans.map(s => {
      const obj = s.toObject();
      if (obj.images && obj.images.length > 0) {
        obj.imageUrls = obj.images.map(imgPath =>
          `${req_host}/uploads/scans/${path.basename(imgPath)}`
        );
      }
      if (obj.detectionImage) {
        obj.detectionUrl = `${req_host}/uploads/scans/${path.basename(obj.detectionImage)}`;
      }
      if (obj.heatmapPath) {
        obj.heatmapUrl = `${req_host}/uploads/heatmaps/${path.basename(obj.heatmapPath)}`;
      }
      // Convert analysis image paths to URLs
      if (obj.analysis && obj.analysis.ai) {
        if (obj.analysis.ai.originalImagePath) {
          obj.analysis.ai.originalImageUrl = `${req_host}/uploads/scans/${path.basename(obj.analysis.ai.originalImagePath)}`;
        }
        if (obj.analysis.ai.detectedImagePath) {
          obj.analysis.ai.detectedImageUrl = `${req_host}/uploads/scans/${path.basename(obj.analysis.ai.detectedImagePath)}`;
        }
        if (obj.analysis.ai.heatmapPath) {
          obj.analysis.ai.heatmapUrl = `${req_host}/uploads/heatmaps/${path.basename(obj.analysis.ai.heatmapPath)}`;
        }
      }
      return obj;
    });

    res.json({
      success: true,
      patient,
      scans: scansWithUrls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/patients
 * Create a new patient
 */
const createPatient = async (req, res, next) => {
  try {
    const { name, age, gender, bloodGroup, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required.',
      });
    }

    const patient = await Patient.create({
      patientId: generatePatientId(),
      name,
      age,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      doctorId: req.doctorId,
    });

    res.status(201).json({
      success: true,
      patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/patients/:id
 * Update patient information
 */
const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'name',
      'age',
      'gender',
      'bloodGroup',
      'phone',
      'email',
      'address',
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

const patient = await Patient.findOneAndUpdate(
      findPatientByIdOrPatientId(id, req.doctorId),
      updates,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    res.json({
      success: true,
      patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/patients/:id
 * Delete a patient and all related data
 */
const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

const patient = await Patient.findOneAndDelete(
      findPatientByIdOrPatientId(id, req.doctorId)
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // Clean up related data
    await Promise.all([
      Scan.deleteMany({ patientId: patient._id }),
      Report.deleteMany({ patientId: patient._id }),
      AnalysisHistory.deleteMany({ patientId: patient._id }),
    ]);

    res.json({
      success: true,
      message: 'Patient and all related data deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
};

