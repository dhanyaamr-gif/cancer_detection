const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reportNumber: {
      type: String,
      required: true,
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
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    prediction: {
      type: String,
      enum: ['Positive', 'Negative', 'Under Review'],
      default: 'Under Review',
    },
    confidence: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Reviewed'],
      default: 'Completed',
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    pdfPath: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Generate report number before saving
reportSchema.pre('save', function (next) {
  if (!this.reportNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.reportNumber = `RP-${timestamp}${random}`;
  }
  next();
});

reportSchema.index({ patientId: 1, createdAt: -1 });
reportSchema.index({ reportNumber: 1 });

module.exports = mongoose.model('Report', reportSchema);