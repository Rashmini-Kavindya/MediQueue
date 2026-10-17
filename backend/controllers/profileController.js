
const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const CaregiverLink = require('../models/CaregiverLink');

// ======================================================
// READ - Get current user's profile
// ======================================================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      userId: req.user.userId
    }).select('-passwordHash -otpCodeHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: 'Profile retrieved successfully.'
    });

  } catch (error) {
    console.error('Get Profile Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve profile.'
    });
  }
};


// ======================================================
// UPDATE - Edit current user's profile
// ======================================================
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      language
    } = req.body;

    const user = await User.findOne({
      userId: req.user.userId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (firstName !== undefined) {
      user.firstName = firstName;
    }

    if (lastName !== undefined) {
      user.lastName = lastName;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (email !== undefined) {
      user.email = email;
    }

    if (language !== undefined) {
      user.language = language;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        language: user.language,
        role: user.role,
        status: user.status
      },
      message: 'Profile updated successfully.'
    });

  } catch (error) {
    console.error('Update Profile Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already in use.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update profile.'
    });
  }
};


// ======================================================
// SOFT DELETE - Deactivate own account
//
// Does NOT delete the User document.
// Does NOT delete patient records, tokens or history.
// Revokes caregiver-patient links where applicable.
// ======================================================
exports.deactivateAccount = async (req, res) => {
  try {
    const user = await User.findOne({
      userId: req.user.userId
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (user.status === 'inactive') {
      return res.status(409).json({
        success: false,
        message: 'This account is already deactivated.'
      });
    }

    // Self-service account deletion is available
    // only for patients and caregivers.
    if (!['patient', 'caregiver'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message:
          'Staff and admin accounts must be managed by an administrator.'
      });
    }

    // ----------------------------------------------
    // CAREGIVER ACCOUNT
    //
    // Revoke this caregiver's patient relationships.
    // Do not delete the patients or the link records.
    // ----------------------------------------------
    if (user.role === 'caregiver' && user.caregiverId) {
      await CaregiverLink.updateMany(
        {
          caregiverId: user.caregiverId,
          status: { $ne: 'revoked' }
        },
        {
          $set: {
            status: 'revoked',
            verified: false
          }
        }
      );
    }

    // ----------------------------------------------
    // PATIENT ACCOUNT
    //
    // Revoke caregiver access to this patient.
    // Do not delete the patient's hospital records.
    // ----------------------------------------------
    if (user.role === 'patient' && user.patientId) {
      await CaregiverLink.updateMany(
        {
          patientId: user.patientId,
          status: { $ne: 'revoked' }
        },
        {
          $set: {
            status: 'revoked',
            verified: false
          }
        }
      );
    }

    // ----------------------------------------------
    // SOFT DELETE
    //
    // The user remains stored in MongoDB.
    // ----------------------------------------------
    user.status = 'inactive';

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        status: user.status
      },
      message:
        'Account deactivated successfully. ' +
        'You will no longer be able to access MediQueue.'
    });

  } catch (error) {
    console.error('Deactivate Account Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to deactivate account.'
    });
  }
};


// ======================================================
// READ - Get current user's preferences
// ======================================================
exports.getPreferences = async (req, res) => {
  try {
    let preferences = await UserPreference.findOne({
      userId: req.user.userId
    });

    if (!preferences) {
      preferences = await UserPreference.create({
        userId: req.user.userId
      });
    }

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Preferences retrieved successfully.'
    });

  } catch (error) {
    console.error('Get Preferences Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve preferences.'
    });
  }
};


// ======================================================
// UPDATE - Edit preferences
// ======================================================
exports.updatePreferences = async (req, res) => {
  try {
    const {
      language,
      channels,
      accessibility,
      privacy
    } = req.body;

    let preferences = await UserPreference.findOne({
      userId: req.user.userId
    });

    if (!preferences) {
      preferences = new UserPreference({
        userId: req.user.userId
      });
    }

    if (language !== undefined) {
      preferences.language = language;
    }

    if (channels !== undefined) {
      preferences.channels = channels;
    }

    if (accessibility !== undefined) {
      preferences.accessibility = {
        ...preferences.accessibility?.toObject?.(),
        ...accessibility
      };
    }

    if (privacy !== undefined) {
      preferences.privacy = {
        ...preferences.privacy?.toObject?.(),
        ...privacy
      };
    }

    await preferences.save();

    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully.'
    });

  } catch (error) {
    console.error('Update Preferences Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update preferences.'
    });
  }
};
