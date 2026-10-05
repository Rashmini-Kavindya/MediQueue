const AlertPreference = require('../models/AlertPreference');


exports.getPreference = async (req, res) => {
  try {
    const userId = req.user.userId;

    let preference = await AlertPreference.findOne({
      userId
    });

    if (!preference) {
      preference = await AlertPreference.create({
        userId,
        threshold: 5,
        channels: ['app'],
        language: 'en'
      });
    }

    res.status(200).json({
      success: true,
      data: preference
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.createOrUpdatePreference = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      threshold,
      channels,
      language
    } = req.body;

    let preference = await AlertPreference.findOne({
      userId
    });

    if (!preference) {
      preference = new AlertPreference({
        userId
      });
    }

    if (threshold !== undefined) {
      preference.threshold = threshold;
    }

    if (channels !== undefined) {
      preference.channels = channels;
    }

    if (language !== undefined) {
      preference.language = language;
    }

    await preference.save();

    res.status(200).json({
      success: true,
      data: preference,
      message: 'Alert preference updated successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};