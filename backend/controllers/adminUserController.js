const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateId } = require('../utils/id');

// Escape special characters before using user input in RegExp
const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};


// ======================================================
// CREATE - Admin creates a staff account
// ======================================================
exports.createStaffUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      nic,
      password,
      language
    } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, phone and password are required.'
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staff = await User.create({
      userId: generateId('USR'),
      staffId: generateId('STF'),

      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      nic,
      passwordHash,

      role: 'staff',
      language: language || 'en',
      status: 'active'
    });

    return res.status(201).json({
      success: true,
      data: {
        userId: staff.userId,
        staffId: staff.staffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        language: staff.language,
        status: staff.status
      },
      message: 'Staff account created successfully.'
    });

  } catch (error) {
    console.error('Create Staff User Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with these details already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create staff account.'
    });
  }
};


// ======================================================
// READ - List/search users
// ======================================================
exports.getUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      status
    } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const safeSearch = escapeRegex(search.trim());

      filter.$or = [
        { userId: { $regex: safeSearch, $options: 'i' } },
        { patientId: { $regex: safeSearch, $options: 'i' } },
        { caregiverId: { $regex: safeSearch, $options: 'i' } },
        { staffId: { $regex: safeSearch, $options: 'i' } },
        { firstName: { $regex: safeSearch, $options: 'i' } },
        { lastName: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash -otpCodeHash -otpExpiresAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: users,
      message: 'Users retrieved successfully.'
    });

  } catch (error) {
    console.error('Get Users Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve users.'
    });
  }
};


// ======================================================
// READ - View one user
// ======================================================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      userId: req.params.id
    }).select('-passwordHash -otpCodeHash -otpExpiresAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully.'
    });

  } catch (error) {
    console.error('Get User Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve user.'
    });
  }
};


// ======================================================
// UPDATE - Admin edits user
// ======================================================
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findOne({
      userId: req.params.id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      nic,
      language,
      status
    } = req.body;

    if (firstName !== undefined) {
      user.firstName = firstName;
    }

    if (lastName !== undefined) {
      user.lastName = lastName;
    }

    if (email !== undefined) {
      user.email = email.toLowerCase();
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (nic !== undefined) {
      user.nic = nic;
    }

    if (language !== undefined) {
      user.language = language;
    }

    if (status !== undefined) {
      if (!['active', 'inactive', 'pending'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account status.'
        });
      }

      user.status = status;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        patientId: user.patientId,
        caregiverId: user.caregiverId,
        staffId: user.staffId,
        adminId: user.adminId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nic: user.nic,
        role: user.role,
        language: user.language,
        status: user.status
      },
      message: 'User updated successfully.'
    });

  } catch (error) {
    console.error('Update User Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email is already in use.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update user.'
    });
  }
};


// ======================================================
// DELETE - Soft deactivate a user
// ======================================================
exports.deactivateUser = async (req, res) => {
  try {
    const user = await User.findOne({
      userId: req.params.id
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Prevent the logged-in admin from deactivating themselves
    if (user.userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own admin account.'
      });
    }

    user.status = 'inactive';

    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        role: user.role,
        status: user.status
      },
      message: 'User deactivated successfully.'
    });

  } catch (error) {
    console.error('Deactivate User Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to deactivate user.'
    });
  }
};