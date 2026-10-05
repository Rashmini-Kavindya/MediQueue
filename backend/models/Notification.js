const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },

  userId: {
    type: String,
    required: true
  },

  tokenId: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ['near', 'called', 'update'],
    required: true
  },

  message: {
    type: String,
    required: true
  },

  channel: {
    type: String,
    enum: ['app', 'sms'],
    required: true,
    default: 'app'
  },

  isRead: {
    type: Boolean,
    default: false
  },

  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, sentAt: -1 });
notificationSchema.index({ tokenId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);