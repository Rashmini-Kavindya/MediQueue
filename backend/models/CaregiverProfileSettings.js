const mongoose = require('mongoose');

const caregiverProfileSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  photoUrl: { type: String, default: '' },
  phoneChange: {
    requestedPhone: String,
    codeHash: String,
    expiresAt: Date,
    requestedAt: Date,
    attempts: { type: Number, default: 0 }
  },
  smsWindow: {
    startedAt: Date,
    count: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('CaregiverProfileSettings', caregiverProfileSettingsSchema);
