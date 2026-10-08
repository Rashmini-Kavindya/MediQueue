const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateId } = require('../utils/id');
const { sendOtpEmail } = require('../utils/sendEmail');
const { sendOtpSms } = require('../utils/sendSms');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

const MIN_PASSWORD_LENGTH = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const VERIFY_REQUIRED_ROLES = ['patient', 'caregiver'];

// ---------- helpers ----------

// +94771234567 / 077 123 4567 -> 0771234567
const cleanPhoneNumber = (num) => {
  if (!num) return '';
  let cleaned = String(num).replace(/[\s-]/g, '');
  if (cleaned.startsWith('+94')) cleaned = '0' + cleaned.slice(3);
  return cleaned;
};

// Raw + cleaned versions of a phone number, for matching
const phoneVariants = (phone) => {
  const raw = String(phone).trim();
  return [...new Set([raw, cleanPhoneNumber(phone)])];
};

// Phone first, then email. Same lookup is used by send-otp, verify-otp and reset-password
const findUserByContact = async ({ phone, email }) => {
  if (phone) {
    const byPhone = await User.findOne({ phone: { $in: phoneVariants(phone) } });
    if (byPhone) return byPhone;
  }
  if (email) {
    return await User.findOne({ email: String(email).trim().toLowerCase() });
  }
  return null;
};

// Schema has no isVerified field, so otpVerifiedAt marks a verified account
const isUserVerified = (user) => !!user.otpVerifiedAt;

// JWT + safe user object returned by login / verify-otp
const buildAuthResponse = (user) => {
  const payload = {
    userId: user.userId,
    role: user.role,
    patientId: user.patientId,
    caregiverId: user.caregiverId,
    staffId: user.staffId,
    adminId: user.adminId
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey123', { expiresIn: '24h' });

  return {
    token,
    user: {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      email: user.email,
      isVerified: isUserVerified(user)
    }
  };
};

// Validates the OTP on a user document. Returns an error message, or null if valid.
const checkOtp = async (user, otp) => {
  if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
    return 'No active OTP request found';
  }
  if (new Date() > new Date(user.otpExpiresAt)) {
    return 'OTP has expired. Please request a new one.';
  }
  const ok = await bcrypt.compare(String(otp).trim(), user.otpCodeHash);
  if (!ok) return 'Invalid OTP code';
  return null;
};

// ---------- 1. REGISTER ----------
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, nic, nicOrPatientId, password, role, language } = req.body;

    const nicValue = String(nic || nicOrPatientId || '').trim().toUpperCase() || undefined;
    const emailValue = email ? String(email).trim().toLowerCase() : undefined;

    if (!firstName || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' });
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      });
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    const passwordHash = await bcrypt.hash(password, 10);

    // Duplicate check (phone / NIC / email)
    const orConditions = [{ phone: { $in: phoneVariants(phone) } }];
    if (emailValue) orConditions.push({ email: emailValue });
    if (nicValue) orConditions.push({ nic: { $in: [nicValue, nicValue.toLowerCase()] } });

    const existing = await User.findOne({ $or: orConditions });

    if (existing) {
      // Registered earlier but never verified -> refresh details, app continues to OTP step
      if (!isUserVerified(existing) && VERIFY_REQUIRED_ROLES.includes(existing.role)) {
        // New email must not belong to some other account
        if (emailValue && emailValue !== existing.email) {
          const emailTaken = await User.findOne({
            email: emailValue,
            userId: { $ne: existing.userId }
          });
          if (emailTaken) {
            return res.status(400).json({
              success: false,
              message: 'This email is already registered.'
            });
          }
          existing.email = emailValue;
        }

        existing.firstName = firstName;
        existing.lastName = lastName || existing.lastName;
        existing.phone = cleanedPhone;
        existing.passwordHash = passwordHash;
        await existing.save();

        return res.status(200).json({
          success: true,
          data: {
            userId: existing.userId,
            role: existing.role,
            roleId: existing.patientId || existing.caregiverId || existing.staffId || existing.adminId,
            firstName: existing.firstName,
            lastName: existing.lastName,
            email: existing.email
          },
          message: 'Account already created but not verified. Please verify with the OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'This phone number, NIC or email is already registered. Please log in.'
      });
    }

    const userId = generateId('USR');
    const userRole = role || 'patient';

    const roleSpecificIds = {};
    if (userRole === 'patient') roleSpecificIds.patientId = generateId('PAT');
    else if (userRole === 'caregiver') roleSpecificIds.caregiverId = generateId('CGV');
    else if (userRole === 'staff') roleSpecificIds.staffId = generateId('STF');
    else if (userRole === 'admin') roleSpecificIds.adminId = generateId('ADM');

    const newUser = new User({
      userId,
      ...roleSpecificIds,
      firstName,
      lastName: lastName || 'N/A',
      email: emailValue,
      phone: cleanedPhone,
      nic: nicValue,
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

// ---------- 2. LOGIN ----------
// No OTP at login: correct ID + password logs the user straight in
exports.login = async (req, res) => {
  try {
    const { identifier, email, nicOrPatientId, password } = req.body;
    const loginId = String(identifier || nicOrPatientId || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your login ID and password' });
    }

    const upper = loginId.toUpperCase();
    const phoneClean = cleanPhoneNumber(loginId);

    const conditions = [
      { nic: { $in: [loginId, upper] } },
      { patientId: { $in: [loginId, upper] } },
      { caregiverId: { $in: [loginId, upper] } }
    ];
    if (loginId.includes('@')) {
      conditions.push({ email: loginId.toLowerCase() });
    }
    if (/^\+?\d{7,15}$/.test(phoneClean)) {
      conditions.push({ phone: { $in: [loginId, phoneClean] } });
    }

    const user = await User.findOne({ $or: conditions });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: buildAuthResponse(user),
      message: 'Logged in successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 3. SEND / REQUEST OTP ----------
// channel = 'sms'   -> code goes to the phone number (register, forgot password by phone)
// channel = 'email' -> code goes to the email (forgot password by email)
exports.sendOtp = async (req, res) => {
  try {
    const { phone, email, channel } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ success: false, message: 'Phone or Email is required' });
    }

    const method =
      channel === 'sms' || channel === 'email' ? channel : phone ? 'sms' : 'email';

    if (method === 'sms' && !phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (method === 'email' && !email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await findUserByContact(method === 'sms' ? { phone } : { email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otpCodeHash = await bcrypt.hash(rawOtp, 10);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();

    let sentTo;
    try {
      if (method === 'email') {
        await sendOtpEmail(user.email, rawOtp);
        const [name, domain] = user.email.split('@');
        sentTo = `${name[0]}***@${domain}`;
      } else {
        await sendOtpSms(user.phone, rawOtp);
        sentTo = `${user.phone.slice(0, 3)} ** *** ${user.phone.slice(-3)}`;
      }
    } catch (sendError) {
      console.error('[OTP SEND FAILED]', sendError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to send the verification code. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      sentTo
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 4. VERIFY OTP ----------
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, email, otp } = req.body;

    if (!otp || (!phone && !email)) {
      return res.status(400).json({ success: false, message: 'OTP and Phone/Email are required' });
    }

    const user = await findUserByContact({ phone, email });

    const otpError = await checkOtp(user, otp);
    if (otpError) {
      return res.status(400).json({ success: false, message: otpError });
    }

    user.otpVerifiedAt = new Date();
    user.otpCodeHash = null;
    user.otpExpiresAt = null;
    user.lastLoginAt = new Date();
    await user.save();

    // App expects { token, user } here, then calls loginWithToken(token, user)
    res.status(200).json({
      success: true,
      data: buildAuthResponse(user),
      message: 'Account verified successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 5. RESET PASSWORD ----------
// Works with the phone number or the email, whichever the code was sent to
exports.resetPassword = async (req, res) => {
  try {
    const { phone, email, otp, newPassword } = req.body;

    if ((!phone && !email) || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone or email, OTP and new password are required'
      });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      });
    }

    const user = await findUserByContact(phone ? { phone } : { email });

    const otpError = await checkOtp(user, otp);
    if (otpError) {
      return res.status(400).json({ success: false, message: otpError });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    if (!user.otpVerifiedAt) user.otpVerifiedAt = new Date(); // contact ownership proven
    user.otpCodeHash = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 7. GOOGLE SIGN-IN / SIGN-UP ----------
// App sends the Google idToken. Existing email -> log in, new email -> register. No OTP.
exports.googleLogin = async (req, res) => {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google token is required' });
    }

    const audience = [
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID
    ].filter(Boolean);

    if (audience.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Google sign-in is not configured on the server'
      });
    }

    // Verify the token really comes from Google and is meant for this app
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[GOOGLE VERIFY FAILED]', verifyError.message);
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(400).json({ success: false, message: 'Your Google email is not verified' });
    }

    const emailValue = String(payload.email).trim().toLowerCase();
    let user = await User.findOne({ email: emailValue });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      const userRole = VERIFY_REQUIRED_ROLES.includes(role) ? role : 'patient';

      const roleSpecificIds = {};
      if (userRole === 'patient') roleSpecificIds.patientId = generateId('PAT');
      else if (userRole === 'caregiver') roleSpecificIds.caregiverId = generateId('CGV');

      const fullName = String(payload.name || '').trim();
      const nameParts = fullName ? fullName.split(/\s+/) : [];
      const firstName = payload.given_name || nameParts[0] || 'User';
      const lastName = payload.family_name || nameParts.slice(1).join(' ') || 'N/A';

      // Schema requires phone + passwordHash, Google gives neither:
      //  - phone is a placeholder (never matches a real number)
      //  - password is random, so password login is impossible until "Forgot password" by email
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

      user = new User({
        userId: generateId('USR'),
        ...roleSpecificIds,
        firstName,
        lastName,
        email: emailValue,
        phone: `google-${payload.sub}`,
        passwordHash: randomPasswordHash,
        role: userRole,
        language: 'si',
        status: 'active',
        otpVerifiedAt: new Date() // Google already verified this email
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: buildAuthResponse(user),
      isNewUser,
      message: isNewUser ? 'Account created with Google' : 'Logged in with Google'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---------- 6. GET CURRENT PROFILE ----------
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