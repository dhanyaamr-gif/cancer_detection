const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
    },
    phone: {
      type: String,
    },
    doctor: {
      type: String,
      trim: true,
    },
    scanType: {
      type: String,
      enum: ['MRI', 'CT', 'PET', 'X-Ray'],
    },
    bodyPart: {
      type: String,
    },
    notes: {
      type: String,
    },
    bloodGroup: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster search
patientSchema.index({ patientId: 1 });
patientSchema.index({ name: 'text', patientId: 'text' });

module.exports = mongoose.model('Patient', patientSchema);