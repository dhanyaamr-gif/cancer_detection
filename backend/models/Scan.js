const mongoose = require('mongoose');

const imageResultSchema = new mongoose.Schema({
  imagePath: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  heatmapPath: { type: String, default: null },
  heatmapUrl: { type: String, default: null },
  detectionPath: { type: String, default: null },
  detectionUrl: { type: String, default: null },
  cancerDetected: { type: Boolean, default: false },
  confidence: { type: Number, default: 0 },
  prediction: { type: String, default: '' },
  cancerType: { type: String, default: '' },
  probability: { type: Number, default: 0 },
  tumor: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  measurements: {
    tumorSize: { type: String, default: '' },
    location: { type: String, default: '' },
    riskLevel: { type: String, default: '' },
  },
  inferenceTime: { type: String, default: '' },
  error: { type: String, default: null },
}, { _id: false });

const scanSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    patientName: {
      type: String,
      default: '',
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    images: [{
      type: String,
    }],
    imageUrls: [{
      type: String,
    }],
    imageResults: [imageResultSchema],
    primaryImageIndex: {
      type: Number,
      default: 0,
    },
    detectionImage: {
      type: String,
      default: null,
    },
    heatmapPath: {
      type: String,
      default: null,
    },
    scanType: {
      type: String,
      enum: ['MRI', 'CT', 'PET', 'X-Ray'],
      default: 'MRI',
    },
    bodyPart: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    analysisStatus: {
      type: String,
      enum: ['Pending', 'Analyzing', 'Completed', 'Failed'],
      default: 'Pending',
    },
    // Complete analysis data structure
    analysis: {
      prediction: { type: String, default: '' },
      confidence: { type: Number, default: 0 },
      cancerDetected: { type: Boolean, default: false },
      cancerType: { type: String, default: '' },
      probability: { type: Number, default: 0 },
      
      tumor: {
        size: { type: String, default: '' },
        location: { type: String, default: '' },
        probability: { type: Number, default: 0 },
        risk: { type: String, default: '' },
        coordinates: {
          x: { type: Number, default: 0 },
          y: { type: Number, default: 0 },
          width: { type: Number, default: 0 },
          height: { type: Number, default: 0 },
        }
      },
      
      clinical: {
        doctorObservation: { type: String, default: '' },
        recommendation: { type: String, default: '' },
        notes: { type: String, default: '' },
        diagnosis: { type: String, default: '' }
      },
      
      ai: {
        explanation: { type: String, default: '' },
        heatmapPath: { type: String, default: '' },
        detectedImagePath: { type: String, default: '' },
        originalImagePath: { type: String, default: '' },
        inferenceTime: { type: String, default: '' },
        modelVersion: { type: String, default: 'NovaDx CNN v4.2' }
      }
    },
    
    // Legacy fields for backward compatibility
    prediction: {
      cancerDetected: { type: Boolean, default: false },
      confidence: { type: Number, default: 0 },
      prediction: { type: String, default: '' },
      cancerType: { type: String, default: '' },
      probability: { type: Number, default: 0 },
      tumor: {
        x: { type: Number },
        y: { type: Number },
        width: { type: Number },
        height: { type: Number },
      },
      measurements: {
        tumorSize: { type: String },
        location: { type: String },
        riskLevel: { type: String },
      },
    },
    aiMetrics: {
      inferenceTime: { type: String },
      modelVersion: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
scanSchema.index({ patientId: 1, createdAt: -1 });
scanSchema.index({ doctorId: 1 });

module.exports = mongoose.model('Scan', scanSchema);

