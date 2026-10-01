const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenId: { type: String, required: true, unique: true }, // TKN-XXXXX
  tokenNo: { type: String, required: true },               // e.g. A-1, A-2
  tokenSequence: { type: Number, required: true },         // 1, 2, 3...
  queueDate: { type: String, required: true },             // YYYY-MM-DD format (Hospital local date)
  
  patientId: { type: String, required: true },             // PAT-XXXXX
  userId: { type: String, required: true },                // USR-XXXXX
  opdId: { type: String, required: true },                 // OPD-XXXXX
  doctorId: { type: String },                               // DOC-XXXXX (optional)
  roomId: { type: String },                                 // ROM-XXXXX (optional)
  
  status: { 
    type: String, 
    enum: ['waiting', 'called', 'hold', 'skipped', 'in-consultation', 'completed', 'cancelled'], 
    default: 'waiting' 
  },
  
  bookedAt: { type: Date, default: Date.now },
  calledAt: { type: Date },
  consultationStartedAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  
  priority: { type: Number, default: 0 },
  trackingCode: { type: String, unique: true, sparse: true } // TRK-XXXXX
}, { timestamps: true });


tokenSchema.index({ opdId: 1, queueDate: 1, tokenSequence: 1 }, { unique: true });
tokenSchema.index({ opdId: 1, queueDate: 1, tokenNo: 1 }, { unique: true });

module.exports = mongoose.model('Token', tokenSchema);