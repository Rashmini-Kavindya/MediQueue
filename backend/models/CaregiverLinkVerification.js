
const mongoose = require('mongoose');
const { generateId } = require('../utils/id');

const caregiverLinkVerificationSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateId('CLV')
    },

    caregiverId: {
      type: String,
      required: true
    },

    patientId: {
      type: String,
      required: true
    },

    patientUserId: {
      type: String,
      required: true
    },

    relationship: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true
    },

    otpHash: {
      type: String,
      required: true
    },

    expiresAt: {
      type: Date,
      required: true
    },

    resendAvailableAt: {
      type: Date,
      required: true
    },

    attempts: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: [
        'sending',
        'pending',
        'verified',
        'expired',
        'locked',
        'failed'
      ],
      default: 'sending'
    },

    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

caregiverLinkVerificationSchema.index({
  caregiverId: 1,
  patientId: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  'CaregiverLinkVerification',
  caregiverLinkVerificationSchema
);
