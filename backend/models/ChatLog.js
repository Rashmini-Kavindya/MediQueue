const mongoose = require('mongoose');

const chatLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true }, // e.g. LOG-8F32A
  userId: { type: String, required: true, index: true },   // USR-XXXXX
  conversationId: { type: String, index: true },          // groups messages of one chat
  title: { type: String, trim: true, maxlength: 80 },     // custom chat name
  symptomQuery: { 
    type: String, 
    required: [true, 'Symptom query is required'], 
    trim: true 
  },
  suggestedOpdId: { type: String },                       // OPD-XXXXX
  aiResponse: { type: String, required: true },
  urgencyLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_EMERGENCY'],
    default: 'LOW'
  }
}, { timestamps: true });

module.exports = mongoose.model('ChatLog', chatLogSchema);