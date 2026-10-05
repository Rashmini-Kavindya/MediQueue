const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['near', 'called', 'update'],
    required: true
  },

  language: {
    type: String,
    enum: ['si', 'en', 'ta'],
    required: true
  },

  body: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

notificationTemplateSchema.index(
  { type: 1, language: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'NotificationTemplate',
  notificationTemplateSchema
);