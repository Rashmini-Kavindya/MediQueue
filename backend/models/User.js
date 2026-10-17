const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  // Role-specific public IDs (existing schema preserved)
  patientId: { type: String, unique: true, sparse: true },
  caregiverId: { type: String, unique: true, sparse: true },
  staffId: { type: String, unique: true, sparse: true },
  adminId: { type: String, unique: true, sparse: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  nic: { type: String },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient', 'caregiver', 'staff', 'admin'], default: 'patient' },
  language: { type: String, default: 'si' },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' },
  otpCodeHash: { type: String },
  otpExpiresAt: { type: Date },
  otpVerifiedAt: { type: Date },
  lastLoginAt: { type: Date },
  // NEW: Only staff accounts created explicitly via the Admin Users screen
  // can potentially be permanently removed (with additional safeguards).
  adminProvisioned: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
