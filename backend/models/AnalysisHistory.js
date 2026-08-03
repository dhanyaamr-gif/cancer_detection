const mongoose = require('mongoose');

const analysisHistorySchema = new mongoose.Schema(
  {
    analysisId: {
      type: String,
      unique: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    patientName: {
      type: String,
      default: '',
    },
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
    },
    scanPath: {
      type: String,
      default: '',
    },
    prediction: {
      type: String,
      default: '',
    },
    confidence: {
      type: Number,
      default: 0,
    },
    tumorSize: {
      type: String,
      default: '',
    },
    riskLevel: {
      type: String,
      default: '',
    },
    probability: {
      type: Number,
      default: 0,
    },
    heatmap: {
      type: String,
      default: '',
    },
    doctor: {
      type: String,
      default: '',
    },
    scanType: {
      type: String,
      default: 'MRI',
    },
    resultLabel: {
      type: String,
      enum: ['Malignant', 'Benign', 'Under Review'],
      default: 'Under Review',
    },
    imageResults: [{
      type: mongoose.Schema.Types.Mixed,
      default: [],
    }],
    primaryImageIndex: {
      type: Number,
      default: 0,
    },
    explanation: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    probabilityScore: {
      type: String,
      default: '',
    },
    inferenceTime: {
      type: String,
      default: '',
    },
    modelVersion: {
      type: String,
      default: '',
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
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
        modelVersion: { type: String, default: '' }
      }
    },
  },
  {
    timestamps: true,
  }
);

// Generate analysisId before saving
analysisHistorySchema.pre('save', function (next) {
  if (!this.analysisId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.analysisId = `AN-${timestamp}${random}`;
  }
  next();
});

analysisHistorySchema.index({ doctorId: 1, createdAt: -1 });
analysisHistorySchema.index({ patientId: 1 });

module.exports = mongoose.model('AnalysisHistory', analysisHistorySchema);
