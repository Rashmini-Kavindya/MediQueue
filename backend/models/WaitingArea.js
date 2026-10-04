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

    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ['lobby', 'canteen'],
      required: true
    },

    location: {
      type: String,
      required: true,
      trim: true
    },

    seating: {
      type: Number,
      required: true,
      min: 0
    },

    distance: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WaitingArea', waitingAreaSchema);