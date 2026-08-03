const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    specialization: {
      type: String,
      default: 'Radiologist & Oncologist',
    },
    hospital: {
      type: String,
      default: 'Northwell Medical Center',
    },
    department: {
      type: String,
      default: 'Neuro Oncology',
    },
    experience: {
      type: String,
      default: '14 years',
    },
    qualifications: [
      {
        type: String,
      },
    ],
    license: {
      type: String,
    },
    phone: {
      type: String,
    },
    avatar: {
      type: String,
      default: 'EM',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
doctorSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
doctorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Doctor', doctorSchema);

