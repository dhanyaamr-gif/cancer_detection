const Report = require('../models/Report');
const Patient = require('../models/Patient');
const Scan = require('../models/Scan');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Helper: Return value or "Not generated" if empty
 */
function orNotGenerated(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not generated';
  }
  return value;
}

/**
 * GET /api/reports
 * Get all reports for the logged-in doctor
 */
const getReports = async (req, res, next) => {
  try {
    const {
      search,
      status,
      prediction,
      confidence,
      scanType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = req.query;

    let query = { doctorId: req.doctorId };

    // Filters
    if (status && status !== 'All') query.status = status;
    if (prediction && prediction !== 'All') query.prediction = prediction;

    if (confidence) {
      if (confidence === 'above-95') query.confidence = { $gt: 95 };
      else if (confidence === '90-95') query.confidence = { $gte: 90, $lte: 95 };
      else if (confidence === 'below-90') query.confidence = { $lt: 90 };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Search by patient name or report number
    if (search) {
      const patientIds = await Patient.find({
        name: { $regex: search, $options: 'i' },
        doctorId: req.doctorId,
      }).distinct('_id');

      query.$or = [
        { reportNumber: { $regex: search, $options: 'i' } },
        { patientId: { $in: patientIds } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('patientId', 'name patientId age gender')
        .populate('doctorId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      reports: reports.map((report) => ({
        id: report._id,
        reportNumber: report.reportNumber,
patient: report.patientId?.name || report.patientName || 'Unknown Patient',
        patientId: report.patientId?.patientId || '',
        doctor: report.doctorId?.name || '',
        prediction: report.prediction,
        confidence: report.confidence,
        status: report.status,
        date: report.createdAt,
        scanDate: report.content?.scanDate || report.createdAt,
      })),
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
 * GET /api/reports/:id
 * Get a single report with full details
 */
const getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patientId', 'name patientId age gender bloodGroup phone email')
      .populate('scanId')
      .populate('doctorId', 'name specialization');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

// Convert image paths to URLs
    const reportObj = report.toObject();
    const req_host = `${req.protocol}://${req.get('host')}`;
    
    if (reportObj.content) {
      if (reportObj.content.imageUrls && reportObj.content.imageUrls.length > 0) {
        reportObj.content.imageUrlList = reportObj.content.imageUrls;
      }
      if (reportObj.content.detectionUrl) {
        reportObj.content.detectionImageUrl = reportObj.content.detectionUrl;
      }
      if (reportObj.content.heatmapUrl) {
        reportObj.content.heatmapImageUrl = reportObj.content.heatmapUrl;
      }
    }

    // Build combined per-slice image array — every uploaded slice is preserved
    const imageUrls = reportObj.content?.imageUrls || [];
    const imageResults = reportObj.content?.imageResults || [];
    const combinedImages = imageUrls.map((url, idx) => {
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
      report: reportObj,
      images: combinedImages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reports
 * Create a new report manually
 */
const createReport = async (req, res, next) => {
  try {
    const { patientId, scanId, prediction, confidence, status } = req.body;

    const report = await Report.create({
      patientId,
      scanId,
      doctorId: req.doctorId,
      prediction: prediction || 'Pending',
      confidence: confidence || 0,
      status: status || 'Pending',
    });

    res.status(201).json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reports/:id/download-pdf
 * Generate and download PDF report with complete analysis data
 */
const downloadPDF = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('patientId', 'name patientId age gender bloodGroup phone email')
      .populate('scanId')
      .populate('doctorId', 'name specialization');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    const req_host = `${req.protocol}://${req.get('host')}`;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `${report.reportNumber || report._id}.pdf`;
    const filePath = path.join(
      __dirname,
      '..',
      'uploads',
      'reports',
      filename
    );

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).fillColor('#7c3aed').text('NovaDx', { align: 'left' });
    doc
      .fontSize(10)
      .fillColor('#64748b')
      .text('AI-Powered Precision Diagnosis - Medical Report', { align: 'left' });
    doc.moveDown();

    // Report ID
    doc
      .fontSize(14)
      .fillColor('#0f172a')
      .text(`Report: ${report.reportNumber || report._id}`);
    doc.moveDown(0.5);

    // Patient Info
    doc.fontSize(12).fillColor('#0f172a').text('Patient Information');
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#334155')
      .text(`Name: ${orNotGenerated(report.patientId?.name)}`);
    doc.text(`Patient ID: ${orNotGenerated(report.patientId?.patientId)}`);
    doc.text(`Age: ${orNotGenerated(report.patientId?.age)}`);
    doc.text(`Gender: ${orNotGenerated(report.patientId?.gender)}`);
    doc.moveDown();

    // Scan Info
    const scan = report.scanId;
    doc.fontSize(12).fillColor('#0f172a').text('Scan Information');
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#334155')
      .text(`Type: ${orNotGenerated(scan?.scanType)}`);
    doc.text(`Body Part: ${orNotGenerated(scan?.bodyPart)}`);
    doc.text(
      `Date: ${scan?.createdAt
        ? new Date(scan.createdAt).toLocaleDateString()
        : 'Not generated'}`
    );
    doc.moveDown();

    // Images
    if (report.content) {
      if (report.content.imageUrls && report.content.imageUrls.length > 0) {
        doc.fontSize(12).fillColor('#0f172a').text('Original Images');
        doc.moveDown(0.3);
        report.content.imageUrls.forEach((imgUrl, idx) => {
          const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${req_host}${imgUrl}`;
          doc
            .fontSize(10)
            .fillColor('#334155')
            .text(`Image ${idx + 1}: ${fullUrl}`);
        });
        doc.moveDown();
      }

      if (report.content.detectionUrl) {
        const fullUrl = report.content.detectionUrl.startsWith('http') 
          ? report.content.detectionUrl 
          : `${req_host}${report.content.detectionUrl}`;
        doc.fontSize(12).fillColor('#0f172a').text('Detection Image');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#334155').text(fullUrl);
        doc.moveDown();
      }

      if (report.content.heatmapUrl) {
        const fullUrl = report.content.heatmapUrl.startsWith('http') 
          ? report.content.heatmapUrl 
          : `${req_host}${report.content.heatmapUrl}`;
        doc.fontSize(12).fillColor('#0f172a').text('Heatmap');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#334155').text(fullUrl);
        doc.moveDown();
      }
    }

    // Prediction
    doc.fontSize(12).fillColor('#0f172a').text('AI Prediction Result');
    doc.moveDown(0.3);
    const predictionColor =
      report.prediction === 'Positive' ? '#dc2626' : '#22c55e';
    doc
      .fontSize(11)
      .fillColor(predictionColor)
      .text(
        `${report.prediction} (${report.confidence}% confidence)`
      );
    doc.moveDown();

    // Tumor Details from analysis
    if (scan?.analysis?.tumor) {
      const tumor = scan.analysis.tumor;
      doc.fontSize(12).fillColor('#0f172a').text('Tumor Details');
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text(`Size: ${orNotGenerated(tumor.size)}`);
      doc.text(`Location: ${orNotGenerated(tumor.location)}`);
      doc.text(`Probability: ${orNotGenerated(tumor.probability)}`);
      doc.text(`Risk Level: ${orNotGenerated(tumor.risk)}`);
      doc.moveDown();
    }

    // Clinical Notes
    if (scan?.analysis?.clinical) {
      const clinical = scan.analysis.clinical;
      if (clinical.notes) {
        doc.fontSize(12).fillColor('#0f172a').text('Clinical Notes');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#334155').text(clinical.notes);
        doc.moveDown();
      }
      if (clinical.doctorObservation) {
        doc.fontSize(12).fillColor('#0f172a').text('Doctor Observation');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#334155').text(clinical.doctorObservation);
        doc.moveDown();
      }
      if (clinical.recommendation) {
        doc.fontSize(12).fillColor('#0f172a').text('Recommendation');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#334155').text(clinical.recommendation);
        doc.moveDown();
      }
      if (clinical.diagnosis) {
        doc.fontSize(12).fillColor('#0f172a').text('Final Diagnosis');
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#334155').text(clinical.diagnosis);
        doc.moveDown();
      }
    }

    // AI Explanation
    if (scan?.analysis?.ai?.explanation) {
      doc.fontSize(12).fillColor('#0f172a').text('AI Explanation');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#334155').text(scan.analysis.ai.explanation);
      doc.moveDown();
    }

    // Footer
    doc
      .fontSize(9)
      .fillColor('#94a3b8')
      .text(
        `Generated by NovaDx on ${new Date().toLocaleDateString()} | Doctor: ${orNotGenerated(report.doctorId?.name)} | Confidential`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          // Clean up file on error
          fs.unlink(filePath, () => {});
          return res.status(500).json({
            success: false,
            message: 'Error downloading PDF.',
          });
        }
        // Clean up file after download
        setTimeout(() => fs.unlink(filePath, () => {}), 5000);
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reports/:id/download-dicom
 * Placeholder for DICOM download
 */
const downloadDICOM = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      'scanId',
      'imagePath'
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    // Check if original scan is DICOM
    const scanPath = report.scanId?.imagePath;
    if (scanPath && scanPath.endsWith('.dcm')) {
      return res.download(scanPath, `${report.reportNumber || 'scan'}.dcm`);
    }

    // Return placeholder if not DICOM
    res.json({
      success: true,
      message:
        'Original scan is not a DICOM file. Please upload a DICOM file to enable this feature.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports,
  getReport,
  createReport,
  downloadPDF,
  downloadDICOM,
};
