const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // USR-UUID
  
  // Role-Specific Public IDs
  patientId: { type: String, unique: true, sparse: true },   // PAT-UUID
  caregiverId: { type: String, unique: true, sparse: true }, // CGV-UUID
  staffId: { type: String, unique: true, sparse: true },     // STF-UUID
  adminId: { type: String, unique: true, sparse: true },     // ADM-UUID

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  nic: { type: String }, 
  phone: { type: String, required: true }, 
  email: { type: String, lowercase: true, unique: true, sparse: true },
  passwordHash: { type: String, required: true },
  
  role: { 
    type: String, 
    enum: ['patient', 'caregiver', 'staff', 'admin'], 
    default: 'patient' 
  },
  
  language: { type: String, default: 'si' },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending'], 
    default: 'active' 
  },
  
  otpCodeHash: { type: String },
  otpExpiresAt: { type: Date },
  otpVerifiedAt: { type: Date },
  lastLoginAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);