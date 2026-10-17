const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  notificationId: { type: String, required: true },
  userId: { type: String },

  channel: {
    type: String,
    enum: ['app', 'sms', 'SMS', 'push', 'email'],
    required: true,
    default: 'app'
  },

  deliveryStatus: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    required: true,
    default: 'pending'
  },

  errorMessage: { type: String, default: '' },
  sentAt: { type: Date, default: Date.now },
  latencyMs: { type: Number, default: 0 }
}, { timestamps: true });

notificationLogSchema.index({ notificationId: 1 });
notificationLogSchema.index({ sentAt: -1 });
notificationLogSchema.index({ deliveryStatus: 1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);