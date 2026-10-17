// Notify.lk SMS helper. Needs Node 18+ (global fetch).
// Used by: OTP (sendOtpSms) and notifications / booking (sendSms)

// 0771234567 / +94771234567 -> 94771234567 (Notify.lk format)
const toIntl = (phone) => {
  let p = String(phone).replace(/[\s-]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '94' + p.slice(1);
  return p;
};

// Generic SMS sender (notifications, booking alerts)
const sendSms = async (phone, message) => {
  const userId = process.env.NOTIFYLK_USER_ID;
  const apiKey = process.env.NOTIFYLK_API_KEY;

  if (!userId || !apiKey) {
    throw new Error('NOTIFYLK_USER_ID / NOTIFYLK_API_KEY missing (check dotenv)');
  }

  const params = new URLSearchParams({
    user_id: userId,
    api_key: apiKey,
    sender_id: process.env.NOTIFYLK_SENDER_ID || 'NotifyDEMO',
    to: toIntl(phone),
    message
  });

  const res = await fetch(`https://app.notify.lk/api/v1/send?${params.toString()}`);
  const data = await res.json();

  if (data.status !== 'success') {
    throw new Error(data.message || JSON.stringify(data.errors) || 'SMS sending failed');
  }
  return data;
};

// OTP sender (same name as before, so auth code keeps working)
const sendOtpSms = async (phone, otp) => {
  return sendSms(
    phone,
    `MediQueue: your verification code is ${otp}. It expires in 10 minutes.`
  );
};

module.exports = { sendSms, sendOtpSms, toIntl };