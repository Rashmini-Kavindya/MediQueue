const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
  // booked = token booked, near = turn approaching, called = your turn now, update = status update
  type: {
    type: String,
    enum: ['booked', 'near', 'called', 'update'],
    required: true
  },

  language: { type: String, enum: ['si', 'en', 'ta'], required: true },

  // Placeholders: {{tokenNo}} {{patientsAhead}} {{room}} {{opdName}}
  body: { type: String, required: true },

  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

notificationTemplateSchema.index({ type: 1, language: 1 }, { unique: true });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);