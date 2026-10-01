const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true }, // e.g. ROM-8F32A
  roomNumber: { type: String, required: true },
  name: { type: String },
  opdId: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);