const mongoose = require('mongoose');

const alertPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },

  threshold: {
    type: Number,
    required: true,
    default: 5,
    min: 1
  },

  channels: [{
    type: String,
    enum: ['app', 'sms']
  }],

  language: {
    type: String,
    enum: ['si', 'en', 'ta'],
    default: 'en'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model(
  'AlertPreference',
  alertPreferenceSchema
);