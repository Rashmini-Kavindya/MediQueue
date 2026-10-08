const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const CaregiverProfileSettings = require('../models/CaregiverProfileSettings');
const { sendOtpSms } = require('../utils/sendSms');

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/[\s()+-]/g, '');
  if (/^07\d{8}$/.test(digits)) return `94${digits.slice(1)}`;
  if (/^947\d{8}$/.test(digits)) return digits;
  return null;
};
const getCaregiver = (id) => User.findOne({ userId: id, role: 'caregiver', status: 'active' });
const getSettings = (id) => CaregiverProfileSettings.findOneAndUpdate(
  { userId: id }, { $setOnInsert: { userId: id } },
  { new: true, upsert: true, runValidators: true }
);

exports.getSettings = async (req, res) => {
  try {
    const user = await getCaregiver(req.user.userId);
    if (!user) return res.status(403).json({ success: false, message: 'Caregiver account unavailable.' });
    const settings = await getSettings(user.userId);
    return res.json({ success: true, data: { photoUrl: settings.photoUrl || '' } });
  } catch (e) {
    console.error('Caregiver profile settings GET:', e.message);
    return res.status(500).json({ success: false, message: 'Unable to load profile settings.' });
  }
};

exports.savePhoto = async (req, res) => {
  try {
    const user = await getCaregiver(req.user.userId);
    if (!user) return res.status(403).json({ success: false, message: 'Caregiver account unavailable.' });
    const photoUrl = String(req.body.photoUrl || '').trim();
    const cloud = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    if (!cloud) return res.status(503).json({ success: false, message: 'Backend Cloudinary cloud name is not configured.' });
    let parsed;
    try { parsed = new URL(photoUrl); } catch { /* handled below */ }
    if (!parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' ||
        !parsed.pathname.startsWith(`/${cloud}/image/upload/`) || photoUrl.length > 1500) {
      return res.status(400).json({ success: false, message: 'Invalid Cloudinary photo URL.' });
    }
    const settings = await getSettings(user.userId);
    settings.photoUrl = photoUrl;
    await settings.save();
    return res.json({ success: true, data: { photoUrl }, message: 'Profile photo updated.' });
  } catch (e) {
    console.error('Caregiver photo SAVE:', e.message);
    return res.status(500).json({ success: false, message: 'Unable to save profile photo.' });
  }
};

exports.saveName = async (req, res) => {
  try {
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    if (!firstName || !lastName || firstName.length > 70 || lastName.length > 70) {
      return res.status(400).json({ success: false, message: 'Enter a valid first and last name (max 70 characters each).' });
    }
    const user = await getCaregiver(req.user.userId);
    if (!user) return res.status(403).json({ success: false, message: 'Caregiver account unavailable.' });
    user.firstName = firstName;
    user.lastName = lastName;
    await user.save();
    return res.json({ success: true, data: { firstName, lastName }, message: 'Profile name updated.' });
  } catch (e) {
    console.error('Caregiver name SAVE:', e.message);
    return res.status(500).json({ success: false, message: 'Unable to update name.' });
  }
};

exports.startPhoneChange = async (req, res) => {
  try {
    const newPhone = normalizePhone(req.body.phone);
    if (!newPhone) return res.status(400).json({ success: false, message: 'Enter a valid Sri Lankan mobile number.' });
    const user = await getCaregiver(req.user.userId);
    if (!user) return res.status(403).json({ success: false, message: 'Caregiver account unavailable.' });
    if (normalizePhone(user.phone) === newPhone) {
      return res.status(400).json({ success: false, message: 'This is already your registered number.' });
    }
    const settings = await getSettings(user.userId);
    const now = Date.now();
    const last = settings.phoneChange?.requestedAt && new Date(settings.phoneChange.requestedAt).getTime();
    if (last && now - last < 60000) return res.status(429).json({ success: false, message: 'Please wait one minute before requesting another code.' });
    const windowStart = settings.smsWindow?.startedAt && new Date(settings.smsWindow.startedAt).getTime();
    if (!windowStart || now - windowStart >= 3600000) settings.smsWindow = { startedAt: new Date(now), count: 0 };
    if ((settings.smsWindow?.count || 0) >= 5) return res.status(429).json({ success: false, message: 'Hourly SMS limit reached. Try again later.' });
    if (!process.env.NOTIFYLK_USER_ID || !process.env.NOTIFYLK_API_KEY) {
      return res.status(503).json({ success: false, message: 'Notify.lk credentials are not configured.' });
    }
    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    settings.phoneChange = {
      requestedPhone: newPhone,
      codeHash: await bcrypt.hash(otp, 10),
      requestedAt: new Date(now),
      expiresAt: new Date(now + 10 * 60000),
      attempts: 0
    };
    settings.smsWindow.count += 1;
    await settings.save();
    try {
      await sendOtpSms(newPhone, otp);
    } catch (e) {
      console.error('Caregiver phone-change SMS:', e.message);
      settings.phoneChange = undefined;
      await settings.save();
      return res.status(502).json({ success: false, message: 'Could not send SMS. Please try again later.' });
    }
    return res.status(201).json({
      success: true,
      data: { expiresInSeconds: 600, maskedPhone: `+94*******${newPhone.slice(-2)}` },
      message: 'Verification SMS requested for your new number.'
    });
  } catch (e) {
    console.error('Caregiver phone-change START:', e.message);
    return res.status(500).json({ success: false, message: 'Could not start phone verification.' });
  }
};

exports.verifyPhoneChange = async (req, res) => {
  try {
    const otp = String(req.body.otp || '');
    if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: 'Enter a six-digit code.' });
    const user = await getCaregiver(req.user.userId);
    if (!user) return res.status(403).json({ success: false, message: 'Caregiver account unavailable.' });
    const settings = await getSettings(user.userId);
    const pending = settings.phoneChange;
    if (!pending?.codeHash || !pending?.expiresAt || new Date(pending.expiresAt) <= new Date()) {
      return res.status(410).json({ success: false, message: 'Code expired or no pending phone change.' });
    }
    if ((pending.attempts || 0) >= 5) return res.status(429).json({ success: false, message: 'Too many attempts. Request a new code.' });
    if (!await bcrypt.compare(otp, pending.codeHash)) {
      settings.phoneChange.attempts += 1;
      await settings.save();
      return res.status(400).json({ success: false, message: 'Incorrect verification code.', attemptsRemaining: 5 - settings.phoneChange.attempts });
    }
    // Do not log verification codes or return them in any response.
    const verifiedPhone = pending.requestedPhone;
    user.phone = verifiedPhone.startsWith('94') ? `0${verifiedPhone.slice(2)}` : verifiedPhone;
    await user.save();
    settings.phoneChange = undefined;
    await settings.save();
    return res.json({ success: true, data: { phone: user.phone }, message: 'Phone number verified and updated.' });
  } catch (e) {
    console.error('Caregiver phone-change VERIFY:', e.message);
    return res.status(500).json({ success: false, message: 'Unable to verify phone number.' });
  }
};
