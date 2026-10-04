const mongoose = require('mongoose');
const { generateId } = require('../utils/id');

const userPreferenceSchema = new mongoose.Schema(
  {
    userPreferenceId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateId('UPR')
    },

    userId: {
      type: String,
      required: true,
      unique: true
    },

    language: {
      type: String,
      enum: ['si', 'en', 'ta'],
      default: 'en'
    },

    channels: {
      type: [String],
      enum: ['sms', 'app'],
      default: ['app']
    },

    accessibility: {
      textSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },

      highContrast: {
        type: Boolean,
        default: false
      }
    },

    privacy: {
      allowCaregiverAccess: {
        type: Boolean,
        default: true
      },

      showQueueDetails: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'UserPreference',
  userPreferenceSchema
);