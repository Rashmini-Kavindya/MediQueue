const mongoose = require('mongoose');
const { generateId } = require('../utils/id');

const waitingAreaSchema = new mongoose.Schema(
  {
    waitingAreaId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateId('WTA')
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: ['lobby', 'canteen', 'waiting_hall', 'other'],
      required: true
    },
    location: { type: String, required: true, trim: true, maxlength: 160 },
    // Static directions, e.g. "Near the pharmacy"; not live navigation.
    nearbyLandmark: { type: String, trim: true, default: '', maxlength: 180 },
    seating: { type: Number, required: true, min: 0, max: 10000 },
    // Retained for compatibility with existing clients/data. Not entered in Admin UI.
    distance: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WaitingArea', waitingAreaSchema);
