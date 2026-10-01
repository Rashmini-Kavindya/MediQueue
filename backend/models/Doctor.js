const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, required: true, unique: true }, // e.g. DOC-9K2B1
  name: { type: String, required: true },
  specialization: { type: String },
  opdIds: [{ type: String }],
  roomId: { type: String },
  workingHours: { type: Object },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', doctorSchema);