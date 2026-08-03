const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Scan = require('../models/Scan');
const Report = require('../models/Report');
const AnalysisHistory = require('../models/AnalysisHistory');
const Notification = require('../models/Notification');
const { analyzeSingleImage } = require('../services/aiService');
const {
  generateReportNumber,
  getResultLabel,
  getReportStatus,
  createNotificationMessage,
} = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

/**
 * Helper: Build query to find patient by either MongoDB _id or custom patientId string.
 * Avoids CastError by only using _id when the value is a valid ObjectId.
 */
function findPatientByIdOrPatientId(id, doctorId = null) {
  const query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query.$or = [{ _id: id }, { patientId: id }];
  } else {
    query.patientId = id;
  }
  if (doctorId) query.doctorId = doctorId;
  return query;
}

/**
 * POST /api/scans/upload
 * Upload scan images and trigger AI analysis on EVERY image individually.
 * Returns the primary image (highest confidence cancer, or first image).
 */
const uploadScan = async (req, res, next) => {
  try {
    let uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      uploadedFiles = req.files;
    } else if (req.file) {
      uploadedFiles = [req.file];
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files uploaded. Supported: PNG, JPG, JPEG, DICOM (.dcm)',
      });
    }

    const { patientId, patientName, age, gender, phone, doctor, scanType, bodyPart, notes } = req.body;

    if (!patientId || !patientName) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and Patient Name are required.',
      });
    }

    // Validate file types
    const allowedExts = ['.png', '.jpg', '.jpeg', '.dcm'];
    for (const file of uploadedFiles) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExts.includes(ext)) {
        uploadedFiles.forEach(f => {
          try { fs.unlinkSync(f.path); } catch(e) { /* ignore */ }
        });
        return res.status(400).json({
          success: false,
          message: `Invalid file type: ${ext}. Supported: PNG, JPG, JPEG, DICOM (.dcm)`,
        });
      }
    }

    // Find or create patient
    let patient = await Patient.findOne(findPatientByIdOrPatientId(patientId));
    if (!patient) {
      // Create new patient with all provided information
      patient = await Patient.create({
        patientId: patientId,
        name: patientName,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        phone: phone || undefined,
        doctor: doctor || undefined,
        scanType: scanType || 'MRI',
        bodyPart: bodyPart || 'Brain',
        notes: notes || undefined,
        doctorId: req.doctorId,
      });
    } else {
      // Update existing patient with new information if provided
      const updateData = {};
      if (age) updateData.age = parseInt(age);
      if (gender) updateData.gender = gender;
      if (phone) updateData.phone = phone;
      if (doctor) updateData.doctor = doctor;
      if (scanType) updateData.scanType = scanType;
      if (bodyPart) updateData.bodyPart = bodyPart;
      if (notes) updateData.notes = notes;
      
      if (Object.keys(updateData).length > 0) {
        await Patient.findByIdAndUpdate(patient._id, updateData);
      }
    }

    // Collect image paths and URLs
    const imagePaths = uploadedFiles.map(f => f.path);
    const imageUrls = uploadedFiles.map(f => 
      `${req.protocol}://${req.get('host')}/uploads/scans/${path.basename(f.path)}`
    );

    const io = req.app.get('io');
    const doctorRoom = `doctor:${req.doctorId}`;

    // Save scan record — start in Analyzing status
    const scan = await Scan.create({
      patientId: patient._id,
      patientName: patient.name,
      doctorId: req.doctorId,
      images: imagePaths,
      imageUrls,
      scanType: scanType || 'MRI',
      bodyPart: bodyPart || 'Brain',
      notes: notes || '',
      analysisStatus: 'Analyzing',
    });

    // Notify: scan uploaded
    await Notification.create({
      doctorId: req.doctorId,
      type: 'scan_uploaded',
      message: createNotificationMessage('scan_uploaded', { patientName: patient.name }),
      relatedId: scan._id,
      relatedModel: 'Scan',
    });

    // Emit upload event
    if (io) {
      io.to(doctorRoom).emit('scan:uploaded', {
        scanId: scan._id,
        patient,
        images: imageUrls,
        scanType: scanType || 'MRI',
        bodyPart: bodyPart || 'Brain',
      });
    }

    // ================================================================
    // Analyse EVERY uploaded image individually (async, non-blocking)
    // ================================================================
    const patientInfo = { patientId: patient.patientId, patientName: patient.name, scanType, bodyPart, notes };

    const analysisPromises = imagePaths.map((imgPath, index) =>
      analyzeSingleImage(imgPath, imageUrls[index], patientInfo)
        .catch(err => ({
          imagePath: imgPath,
          imageUrl: imageUrls[index],
          heatmapPath: null,
          heatmapUrl: null,
          detectionPath: null,
          detectionUrl: null,
          cancerDetected: false,
          confidence: 0,
          prediction: 'Analysis Failed',
          cancerType: '',
          probability: 0,
          tumor: { x: 0, y: 0, width: 0, height: 0 },
          measurements: { tumorSize: '', location: '', riskLevel: '' },
          inferenceTime: '',
          error: err.message,
        }))
    );

    // Await all analyses in parallel
    const imageResults = await Promise.all(analysisPromises);

    // Determine primary image index: highest cancer confidence wins
    let primaryImageIndex = 0;
    let highestConfidence = 0;
    imageResults.forEach((result, idx) => {
      if (result.cancerDetected && result.confidence > highestConfidence) {
        highestConfidence = result.confidence;
        primaryImageIndex = idx;
      }
    });

    // Update scan with all results
    const primaryResult = imageResults[primaryImageIndex] || imageResults[0] || {};
    
    // Build complete analysis object with all required fields
    const analysisData = {
      prediction: primaryResult.prediction || 'No Cancer Detected',
      confidence: primaryResult.confidence || 0,
      cancerDetected: primaryResult.cancerDetected || false,
      cancerType: primaryResult.cancerType || '',
      probability: primaryResult.probability || 0,
      
      tumor: {
        size: primaryResult.measurements?.tumorSize || '',
        location: primaryResult.measurements?.location || '',
        probability: primaryResult.probability || 0,
        risk: primaryResult.measurements?.riskLevel || '',
        coordinates: {
          x: primaryResult.tumor?.x || 0,
          y: primaryResult.tumor?.y || 0,
          width: primaryResult.tumor?.width || 0,
          height: primaryResult.tumor?.height || 0,
        }
      },
      
      clinical: {
        doctorObservation: primaryResult.doctorObservation || '',
        recommendation: primaryResult.recommendation || '',
        notes: notes || '',
        diagnosis: primaryResult.finalDiagnosis || ''
      },
      
      ai: {
        explanation: primaryResult.explanation || '',
        heatmapPath: primaryResult.heatmapPath || '',
        detectedImagePath: primaryResult.detectionPath || '',
        originalImagePath: imagePaths[primaryImageIndex] || imagePaths[0] || '',
        inferenceTime: primaryResult.inferenceTime || '',
        modelVersion: 'NovaDx CNN v4.2'
      }
    };
    
    scan.imageResults = imageResults;
    scan.primaryImageIndex = primaryImageIndex;
    scan.analysis = analysisData;
    scan.prediction = {
      cancerDetected: primaryResult.cancerDetected || false,
      confidence: primaryResult.confidence || 0,
      prediction: primaryResult.prediction || 'No Cancer Detected',
      cancerType: primaryResult.cancerType || '',
      probability: primaryResult.probability || 0,
      tumor: primaryResult.tumor || { x: 0, y: 0, width: 0, height: 0 },
      measurements: primaryResult.measurements || { tumorSize: '', location: '', riskLevel: '' },
    };
    scan.detectionImage = primaryResult.detectionPath || null;
    scan.heatmapPath = primaryResult.heatmapPath || null;
    scan.analysisStatus = 'Completed';
    scan.aiMetrics = {
      inferenceTime: imageResults.map(r => r.inferenceTime).join(', '),
      modelVersion: 'NovaDx CNN v4.2',
    };
    await scan.save();

    // Create analysis history entry (one per session)
    const primaryPrediction = primaryResult.prediction || 'No Cancer Detected';
    const resultLabel = getResultLabel(primaryResult.cancerDetected, primaryResult.confidence);
    const historyEntry = await AnalysisHistory.create({
      patientId: patient._id,
      patientName: patient.name,
      scanId: scan._id,
      scanPath: imageUrls[primaryImageIndex] || imageUrls[0] || '',
      prediction: primaryResult.cancerDetected ? (primaryResult.cancerType || primaryPrediction) : 'No Cancer Detected',
      confidence: primaryResult.confidence || 0,
      cancerType: primaryResult.cancerType || '',
      scanType: scanType || 'MRI',
      resultLabel,
      imageResults,
      primaryImageIndex,
      explanation: primaryResult.explanation || (primaryResult.cancerDetected 
        ? `The highlighted lesion demonstrates irregular borders, heterogeneous density, and spiculated margins consistent with malignant tissue. Grad-CAM confirms that the prediction is based primarily on the highlighted tumor region.`
        : `The highlighted tissue demonstrates a uniform density distribution and smooth contouring, which is consistent with benign tissue organization. Grad-CAM coverage remains broad without focal hotspot concentration.`),
      tumorSize: primaryResult.measurements?.tumorSize || '',
      location: primaryResult.measurements?.location || '',
      probability: primaryResult.probability || 0,
      heatmap: primaryResult.heatmapUrl || '',
      doctor: doctor || '',
      inferenceTime: primaryResult.inferenceTime || '',
      modelVersion: 'NovaDx CNN v4.2',
      doctorId: req.doctorId,
      analysis: analysisData,
    });

    // Generate report with all images
    const reportPrediction = primaryResult.cancerDetected ? 'Positive' : 'Negative';
    const report = await Report.create({
      reportNumber: generateReportNumber(),
      patientId: patient._id,
      patientName: patient.name,
      scanId: scan._id,
      doctorId: req.doctorId,
      prediction: reportPrediction,
      confidence: primaryResult.confidence || 0,
      status: getReportStatus(resultLabel),
      content: {
        scanType,
        bodyPart,
        notes,
        patientName: patient.name,
        patientId: patient.patientId,
        imageUrls,
        imageResults,
        primaryImageIndex,
        detectionUrl: primaryResult.detectionUrl || null,
        heatmapUrl: primaryResult.heatmapUrl || null,
      },
    });

    // Create notifications
    const hasCancer = imageResults.some(r => r.cancerDetected);
    const notificationType = hasCancer ? 'cancer_detected' : 'healthy_scan';
    const notifData = {
      patientName: patient.name,
      prediction: primaryResult.prediction,
      cancerType: primaryResult.cancerType || primaryResult.prediction,
      confidence: primaryResult.confidence,
    };

    await Notification.create({
      doctorId: req.doctorId,
      type: notificationType,
      message: createNotificationMessage(notificationType, notifData),
      relatedId: scan._id,
      relatedModel: 'Scan',
    });

    await Notification.create({
      doctorId: req.doctorId,
      type: 'report_generated',
      message: createNotificationMessage('report_generated', {
        patientName: patient.name,
        reportNumber: report.reportNumber,
      }),
      relatedId: report._id,
      relatedModel: 'Report',
    });

    // Prepare response data
    const responseData = {
      scan: {
        ...scan.toObject(),
        imageUrls,
        imageResults,
        primaryImageIndex,
        images: imageUrls,
      },
      patient,
      analysis: historyEntry,
      report,
      prediction: {
        ...primaryResult,
        resultLabel,
      },
      imageResults,
      primaryImageIndex,
    };

    // Emit Socket.IO events
    if (io) {
      io.to(doctorRoom).emit('analysis:completed', responseData);
      io.to(doctorRoom).emit('dashboard:update', {
        patientCount: await Patient.countDocuments({ doctorId: req.doctorId }),
        reportCount: await Report.countDocuments({ doctorId: req.doctorId }),
      });
      io.to(doctorRoom).emit('notification:new', {
        type: notificationType,
        message: createNotificationMessage(notificationType, notifData),
      });
      io.to(doctorRoom).emit('patients:update', {
        patient: {
          ...patient.toObject(),
          latestScan: {
            confidence: primaryResult.confidence,
            cancerType: primaryResult.cancerType || primaryResult.prediction,
            scanType: scanType || 'MRI',
            date: scan.createdAt,
            cancerDetected: primaryResult.cancerDetected,
          },
        },
      });
      io.to(doctorRoom).emit('history:update', historyEntry);
      io.to(doctorRoom).emit('reports:update', report);
    }

    res.status(201).json({
      success: true,
      ...responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/scans/:id
 * Get a single scan by ID with full details
 */
const getScan = async (req, res, next) => {
  try {
    const scan = await Scan.findById(req.params.id)
      .populate('patientId', 'name patientId age gender phone doctor scanType bodyPart notes')
      .populate('doctorId', 'name specialization');

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found.',
      });
    }

    // Convert image paths to URLs
    const scanObj = scan.toObject();
    const req_host = `${req.protocol}://${req.get('host')}`;
    
    if (scanObj.images && scanObj.images.length > 0) {
      scanObj.imageUrls = scanObj.images.map(imgPath => 
        `${req_host}/uploads/scans/${path.basename(imgPath)}`
      );
    }
    if (scanObj.detectionImage) {
      scanObj.detectionUrl = `${req_host}/uploads/scans/${path.basename(scanObj.detectionImage)}`;
    }
    if (scanObj.heatmapPath) {
      scanObj.heatmapUrl = `${req_host}/uploads/heatmaps/${path.basename(scanObj.heatmapPath)}`;
    }
    
    // Convert analysis image paths to URLs
    if (scanObj.analysis) {
      if (scanObj.analysis.ai) {
        if (scanObj.analysis.ai.originalImagePath) {
          scanObj.analysis.ai.originalImageUrl = `${req_host}/uploads/scans/${path.basename(scanObj.analysis.ai.originalImagePath)}`;
        }
        if (scanObj.analysis.ai.detectedImagePath) {
          scanObj.analysis.ai.detectedImageUrl = `${req_host}/uploads/scans/${path.basename(scanObj.analysis.ai.detectedImagePath)}`;
        }
        if (scanObj.analysis.ai.heatmapPath) {
          scanObj.analysis.ai.heatmapUrl = `${req_host}/uploads/heatmaps/${path.basename(scanObj.analysis.ai.heatmapPath)}`;
        }
      }
    }

    // Build combined per-slice image array — every uploaded slice is preserved
    const imageResults = scanObj.imageResults || [];
    const combinedImages = (scanObj.imageUrls || []).map((url, idx) => {
      const r = imageResults[idx] || {};
      const heatmapRel = r.heatmapUrl || '';
      const detectionRel = r.detectionUrl || '';
      return {
        original: url,
        heatmap: heatmapRel ? (heatmapRel.startsWith('http') ? heatmapRel : `${req_host}${heatmapRel}`) : '',
        detection: detectionRel ? (detectionRel.startsWith('http') ? detectionRel : `${req_host}${detectionRel}`) : '',
        confidence: r.confidence || 0,
        cancerDetected: r.cancerDetected || false,
        prediction: r.prediction || '',
        cancerType: r.cancerType || '',
        probability: r.probability || 0,
        tumor: r.tumor || {},
        measurements: r.measurements || {},
        inferenceTime: r.inferenceTime || '',
      };
    });

    res.json({
      success: true,
      scanId: scanObj._id,
      patientId: scanObj.patientId,
      prediction: scanObj.analysis?.prediction || scanObj.prediction?.prediction || '',
      scan: scanObj,
      images: combinedImages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/scans/patient/:id
 * Get all scans for a specific patient
 */
const getPatientScans = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find patient by MongoDB _id or custom patientId
    let patient;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      patient = await Patient.findById(id);
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: id, doctorId: req.doctorId });
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    const scans = await Scan.find({ patientId: patient._id })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'name');

    // Convert image paths to URLs
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
      return obj;
    });

    res.json({
      success: true,
      scans: scansWithUrls,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadScan, getScan, getPatientScans };