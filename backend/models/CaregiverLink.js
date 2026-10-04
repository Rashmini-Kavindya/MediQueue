const mongoose = require('mongoose');
const { generateId } = require('../utils/id');

const caregiverLinkSchema = new mongoose.Schema(
  {
    linkId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateId('LNK')
    },

    caregiverId: {
      type: String,
      required: true
    },

    patientId: {
      type: String,
      required: true
    },

    relationship: {
      type: String,
      required: true,
      trim: true
    },

    verified: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'revoked'],
      default: 'pending'
    },

    verificationMethod: {
      type: String,
      default: 'ID/NIC + phone'
    },

    verifiedBy: {
      type: String,
      default: null
    },

    verifiedAt: {
      type: Date,
      default: null
    },

    linkedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent the same caregiver from linking the same patient twice
caregiverLinkSchema.index(
  { caregiverId: 1, patientId: 1 },
  { unique: true }
);

module.exports = mongoose.model('CaregiverLink', caregiverLinkSchema);