const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    criticalAlerts: {
      type: Boolean,
      default: true,
    },
    reportReadyNotifications: {
      type: Boolean,
      default: true,
    },
    autoSaveReports: {
      type: Boolean,
      default: true,
    },
    showExplainableAi: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);

