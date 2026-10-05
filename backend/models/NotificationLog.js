const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true
  },

  channel: {
    type: String,
    enum: ['app', 'sms'],
    required: true
  },

  deliveryStatus: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    required: true,
    default: 'pending'
  },

  sentAt: {
    type: Date,
    default: Date.now
  },

  latencyMs: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

notificationLogSchema.index({ notificationId: 1 });
notificationLogSchema.index({ sentAt: -1 });

module.exports = mongoose.model(
  'NotificationLog',
  notificationLogSchema
);