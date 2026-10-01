const mongoose = require('mongoose');

const opdSchema = new mongoose.Schema({
  opdId: { type: String, required: true, unique: true }, // e.g. OPD-3M1P9
  name: { type: String, required: true },
  department: { type: String, required: true },
  roomId: { type: String },
  doctorIds: [{ type: String }],
  avgConsultMinutes: { type: Number, required: true, default: 10 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('OPD', opdSchema);