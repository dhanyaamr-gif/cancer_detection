const AnalysisHistory = require('../models/AnalysisHistory');
const Patient = require('../models/Patient');
const Scan = require('../models/Scan');
const path = require('path');

/**
 * GET /api/history
 * Get analysis history with filters and pagination
 */
const getHistory = async (req, res, next) => {
  try {
    const {
      search,
      sort = 'newest',
      resultLabel,
      scanType,
      page = 1,
      limit = 20,
      doctorId,
    } = req.query;

    let query = {};
    
    // If doctorId provided, filter by doctor (admin use)
    // Otherwise, use logged-in doctor's ID
    if (doctorId) {
      query.doctorId = doctorId;
    } else {
      query.doctorId = req.doctorId;
    }

    // Filter by result type
    if (resultLabel && resultLabel !== 'All') {
      query.resultLabel = resultLabel;
    }

    // Filter by scan type
    if (scanType && scanType !== 'All') {
      query.scanType = scanType;
    }

    // Search by patient name or ID
    if (search) {
      const patientIds = await Patient.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } },
        ],
      }).distinct('_id');
      
      query.patientId = { $in: patientIds };
    }

    // Sort order
    let sortOrder = {};
    switch (sort) {
      case 'oldest':
        sortOrder = { createdAt: 1 };
        break;
      case 'highest-confidence':
      case 'confidence':
        sortOrder = { confidence: -1 };
        break;
      case 'lowest-confidence':
        sortOrder = { confidence: 1 };
        break;
      case 'patient-az':
        sortOrder = { patientName: 1 };
        break;
      case 'patient-za':
        sortOrder = { patientName: -1 };
        break;
      case 'cancer-type':
        sortOrder = { prediction: 1 };
        break;
      case 'scan-type':
        sortOrder = { scanType: 1 };
        break;
      default: // newest
        sortOrder = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      AnalysisHistory.find(query)
        .populate('patientId', 'name patientId age gender')
        .populate('doctorId', 'name specialization')
        .populate('scanId')
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit)),
      AnalysisHistory.countDocuments(query),
    ]);

    const req_host = `${req.protocol}://${req.get('host')}`;

    // Format response - no N/A values, use "Not generated" instead
    const formattedHistory = history.map((entry) => {
      const patient = entry.patientId || {};
      const scan = entry.scanId || {};
      const scanObj = scan.toObject ? scan.toObject() : scan;
      
      // Build image URLs from scan
      let imageUrls = entry.imageUrls || [];
      if (scanObj.images && scanObj.images.length > 0 && imageUrls.length === 0) {
        imageUrls = scanObj.images.map((imgPath) => 
          `${req_host}/uploads/scans/${path.basename(imgPath)}`
        );
      }
      
      // Get heatmap URL
      let heatmapUrl = entry.heatmap || '';
      if (!heatmapUrl && scanObj.heatmapPath) {
        heatmapUrl = `${req_host}/uploads/heatmaps/${path.basename(scanObj.heatmapPath)}`;
      }
      if (!heatmapUrl && scanObj.analysis?.ai?.heatmapPath) {
        heatmapUrl = `${req_host}/uploads/heatmaps/${path.basename(scanObj.analysis.ai.heatmapPath)}`;
      }
      
      // Get detection URL
      let detectionUrl = '';
      if (scanObj.detectionImage) {
        detectionUrl = `${req_host}/uploads/scans/${path.basename(scanObj.detectionImage)}`;
      }
      if (!detectionUrl && scanObj.analysis?.ai?.detectedImagePath) {
        detectionUrl = `${req_host}/uploads/scans/${path.basename(scanObj.analysis.ai.detectedImagePath)}`;
      }
      
      // Get original image URL
      let originalImageUrl = '';
      if (scanObj.images && scanObj.images.length > 0) {
        originalImageUrl = `${req_host}/uploads/scans/${path.basename(scanObj.images[0])}`;
      }
      
      // Build complete analysis object from scan
      const analysis = scanObj.analysis || {};
      const tumor = analysis.tumor || {};
      const clinical = analysis.clinical || {};
      const ai = analysis.ai || {};
      
      return {
        _id: entry._id,
        id: entry._id,
        analysisId: entry.analysisId,
        patientId: patient.patientId || '',
        patientName: entry.patientName || patient.name || 'No patient selected',
        patientAge: patient.age || 0,
        patientGender: patient.gender || 'Other',
        title: entry.prediction || 'No Cancer Detected',
        prediction: entry.prediction || 'No Cancer Detected',
        confidence: entry.confidence || 0,
        cancerType: entry.cancerType || '',
        scanType: entry.scanType || 'MRI',
        date: entry.createdAt,
        doctor: entry.doctor || (entry.doctorId?.name || ''),
        doctorName: entry.doctor || (entry.doctorId?.name || ''),
        resultLabel: entry.resultLabel,
        heatmapUrl: heatmapUrl,
        detectionUrl: detectionUrl,
        originalImageUrl: originalImageUrl,
        imageUrls: imageUrls,
        imageResults: entry.imageResults || [],
        primaryImageIndex: entry.primaryImageIndex ?? 0,
        explanation: entry.explanation || '',
        tumorSize: entry.tumorSize || tumor.size || '',
        location: entry.location || tumor.location || '',
        probabilityScore: String(entry.probabilityScore || tumor.probability || ''),
        riskLevel: entry.riskLevel || tumor.risk || '',
        inferenceTime: entry.inferenceTime || '',
        modelVersion: entry.modelVersion || '',
        scanId: typeof entry.scanId === 'object' ? (entry.scanId?._id || entry._id) : (entry.scanId || entry._id),
        analysis: analysis,
      };
    });

    res.json({
      success: true,
      history: formattedHistory,
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

module.exports = { getHistory };
