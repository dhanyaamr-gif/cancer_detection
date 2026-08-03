const Scan = require('../models/Scan');
const Patient = require('../models/Patient');
const { analyzeImage } = require('../services/aiService');
const path = require('path');

/**
 * POST /api/analyze
 * Run AI analysis on an existing scan or uploaded image
 */
const analyzeScan = async (req, res, next) => {
  try {
    const { scanId, imagePath, patientInfo } = req.body;

    let imageToAnalyze = imagePath;

    // If scanId provided, get the image from the scan record
    if (scanId) {
      const scan = await Scan.findById(scanId);
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: 'Scan not found.',
        });
      }
      imageToAnalyze = scan.images && scan.images.length > 0 ? scan.images[0] : scan.imagePath;
    }

    if (!imageToAnalyze) {
      return res.status(400).json({
        success: false,
        message: 'No image provided for analysis.',
      });
    }

    // Run AI analysis
    const aiResult = await analyzeImage(imageToAnalyze, patientInfo || {});

    // Update scan if scanId provided - save complete analysis data
    if (scanId) {
      const req_host = `${req.protocol}://${req.get('host')}`;
      
      const analysisData = {
        prediction: aiResult.prediction || 'No Cancer Detected',
        confidence: aiResult.confidence || 0,
        cancerDetected: aiResult.cancerDetected || false,
        cancerType: aiResult.cancerType || '',
        probability: aiResult.probability || 0,
        
        tumor: {
          size: aiResult.measurements?.tumorSize || '',
          location: aiResult.measurements?.location || '',
          probability: aiResult.probability || 0,
          risk: aiResult.measurements?.riskLevel || '',
          coordinates: {
            x: aiResult.tumor?.x || 0,
            y: aiResult.tumor?.y || 0,
            width: aiResult.tumor?.width || 0,
            height: aiResult.tumor?.height || 0,
          }
        },
        
        clinical: {
          doctorObservation: aiResult.doctorObservation || '',
          recommendation: aiResult.recommendation || '',
          notes: aiResult.notes || '',
          diagnosis: aiResult.finalDiagnosis || ''
        },
        
        ai: {
          explanation: aiResult.explanation || '',
          heatmapPath: aiResult.heatmapPath || '',
          detectedImagePath: aiResult.detectionPath || '',
          originalImagePath: imageToAnalyze || '',
          inferenceTime: aiResult.inferenceTime || '',
          modelVersion: aiResult.modelVersion || 'NovaDx CNN v4.2'
        }
      };
      
      await Scan.findByIdAndUpdate(scanId, {
        analysis: analysisData,
        prediction: {
          cancerDetected: aiResult.cancerDetected || false,
          confidence: aiResult.confidence || 0,
          prediction: aiResult.prediction || '',
          probability: aiResult.probability || 0,
          tumor: aiResult.tumor || {},
          measurements: aiResult.measurements || {},
        },
        aiMetrics: {
          inferenceTime: aiResult.inferenceTime || '',
          modelVersion: aiResult.modelVersion || 'NovaDx CNN v4.2',
        },
      });
    }

    res.json({
      success: true,
      ...aiResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analysis/:scanId
 * Return complete analysis data for a scan
 */
const getAnalysis = async (req, res, next) => {
  try {
    const { scanId } = req.params;
    
    // Validate scanId is not an object
    if (typeof scanId === 'object' || scanId === '[object Object]') {
      return res.status(400).json({
        success: false,
        message: 'Invalid scan ID format.',
      });
    }
    
    const scan = await Scan.findById(scanId)
      .populate('patientId', 'name patientId age gender phone doctor scanType bodyPart notes')
      .populate('doctorId', 'name specialization');

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: 'Scan not found.',
      });
    }

    const scanObj = scan.toObject();
    const req_host = `${req.protocol}://${req.get('host')}`;
    
    // Convert image paths to URLs
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
      patient: scanObj.patientId,
      analysis: scanObj.analysis,
      images: combinedImages,
      heatmap: scanObj.heatmapUrl,
      tumorDetails: scanObj.analysis?.tumor || {},
      clinicalNotes: scanObj.analysis?.clinical || {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyzeScan, getAnalysis };
