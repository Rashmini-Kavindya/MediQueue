const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, required: true, unique: true },
  consultationId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  opdId: { type: String, required: true },
  medicines: [
    {
      medicineName: { type: String, required: true },
      dosage: { type: String, required: true },
      frequency: { type: String, required: true },
      duration: { type: String, required: true },
      instructions: { type: String }
    }
  ],
  notes: { type: String },
  prescribedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);