const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },

  // Admin manual notifications have no token, so this is optional now
  tokenId: { type: String, default: '' },

  title: { type: String },
  room: { type: String },

  type: {
    type: String,
    enum: ['booked', 'near', 'called', 'update', 'QUEUE_UPDATE', 'YOUR_TURN', 'TURN_NEAR'],
    required: true
  },

  message: { type: String, required: true },

  channel: {
    type: String,
    enum: ['app', 'sms', 'SMS', 'push', 'email'],
    required: true,
    default: 'app'
  },

  // Set when an admin sends one message to a group (a role or everyone).
  // Every recipient still gets their own copy; the admin list groups them by this id.
  broadcastId: { type: String, index: true },
  audience: { type: String }, // 'all' | 'role:<role>' | 'user'

  // system = auto generated (queue events), admin = created manually from admin panel
  source: { type: String, enum: ['system', 'admin'], default: 'system' },

  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now }
}, { timestamps: true });

notificationSchema.index({ userId: 1, sentAt: -1 });
notificationSchema.index({ tokenId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);