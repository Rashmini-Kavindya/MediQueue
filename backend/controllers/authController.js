const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateId } = require('../utils/id');

// 1. REGISTER
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, nic, password, role, language } = req.body;

    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = generateId('USR'); // Output e.g., USR-A849K
    const userRole = role || 'patient';

    let roleSpecificIds = {};
    if (userRole === 'patient') roleSpecificIds.patientId = generateId('PAT'); // e.g., PAT-7B2M9
    else if (userRole === 'caregiver') roleSpecificIds.caregiverId = generateId('CGV');
    else if (userRole === 'staff') roleSpecificIds.staffId = generateId('STF');
    else if (userRole === 'admin') roleSpecificIds.adminId = generateId('ADM');

    const newUser = new User({
      userId,
      ...roleSpecificIds,
      firstName,
      lastName,
      email,
      phone,
      nic,
      passwordHash,
      role: userRole,
      language: language || 'si',
      status: 'active'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      data: {
        userId: newUser.userId,
        role: newUser.role,
        roleId: newUser.patientId || newUser.caregiverId || newUser.staffId || newUser.adminId,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const payload = {
      userId: user.userId,
      role: user.role,
      patientId: user.patientId,
      caregiverId: user.caregiverId,
      staffId: user.staffId,
      adminId: user.adminId
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secretkey123',
      { expiresIn: '24h' }
    );

    user.lastLoginAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          email: user.email
        }
      },
      message: 'Logged in successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. GET CURRENT PROFILE
exports.getMe = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('-passwordHash -otpCodeHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};