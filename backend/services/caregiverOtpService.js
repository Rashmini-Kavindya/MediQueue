const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const Notification = require('../models/Notification');
const { generateId } = require('../utils/id');
const { sendOtpSms } = require('../utils/sendSms');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Convert Sri Lankan mobile numbers into one standard format.
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^07\d{8}$/.test(digits)) return `94${digits.slice(1)}`;
  if (/^947\d{8}$/.test(digits)) return digits;
  return null;
};

const phonesMatch = (first, second) => {
  const a = normalizePhone(first);
  const b = normalizePhone(second);
  return !!a && !!b && a === b;
};

const generateOtp = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const hashOtp = async (otp) => bcrypt.hash(otp, 10);
const compareOtp = async (otp, hash) => bcrypt.compare(String(otp), hash);

const checkSmsConfiguration = () => {
  if (!process.env.NOTIFYLK_USER_ID || !process.env.NOTIFYLK_API_KEY) {
    throw new Error('Notify.lk SMS credentials are not configured.');
  }
};

const sendPatientOtp = async (phone, otp) => {
  checkSmsConfiguration();
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Invalid Sri Lankan mobile number.');
  // Reuse the group's existing SMS implementation, without logging the OTP.
  await sendOtpSms(normalized, otp);
};

const createPatientOtpAlert = async ({
  patientUserId, verificationId, caregiverName, otp
}) => Notification.create({
  notificationId: generateId('NTF'),
  userId: patientUserId,
  // Required by the shared Notification schema; not a real token.
  tokenId: verificationId,
  title: 'Caregiver Link Verification',
  type: 'update',
  channel: 'app',
  message:
    `${caregiverName} is requesting to link your ` +
    `MediQueue account as a caregiver. ` +
    `Your consent code is ${otp}. ` +
    `Only share this code if you approve the request. ` +
    `It expires in 10 minutes.`,
  isRead: false,
  sentAt: new Date()
});

const createLinkSuccessAlert = async ({
  patientUserId, linkId, caregiverName
}) => Notification.create({
  notificationId: generateId('NTF'),
  userId: patientUserId,
  tokenId: linkId,
  title: 'Caregiver Linked Successfully',
  type: 'update',
  channel: 'app',
  message:
    `${caregiverName} has been linked ` +
    `to your MediQueue account as a caregiver.`,
  isRead: false,
  sentAt: new Date()
});

// NEW: caregiver-specific confirmation. No OTP included.
const createCaregiverLinkSuccessAlert = async ({
  caregiverUserId, linkId, patientName
}) => Notification.create({
  notificationId: generateId('NTF'),
  userId: caregiverUserId,
  tokenId: linkId,
  title: 'Patient Linked Successfully',
  type: 'update',
  channel: 'app',
  message:
    `${patientName} has been successfully linked to your ` +
    `caregiver account. You can now track their queue.`,
  isRead: false,
  sentAt: new Date()
});

const maskPhone = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return 'Unknown';
  return `+94*******${normalized.slice(-2)}`;
};

module.exports = {
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  normalizePhone,
  phonesMatch,
  generateOtp,
  hashOtp,
  compareOtp,
  sendPatientOtp,
  createPatientOtpAlert,
  createLinkSuccessAlert,
  createCaregiverLinkSuccessAlert,
  maskPhone
};
