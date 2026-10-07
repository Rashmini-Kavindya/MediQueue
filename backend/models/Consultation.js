const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  consultationId: {type: String, required: true, unique: true},
  tokenId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  doctorId: { type: String },
  opdId: { type: String, required: true },
  roomId: { type: String },
  startedAt: { type: Date },
  endedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);