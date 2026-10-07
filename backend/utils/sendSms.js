// Sends the OTP by SMS using Notify.lk (used only for users who have no email).
// Needs Node 18+ (global fetch).

// 0771234567 / +94771234567 -> 94771234567 (Notify.lk format)
const toIntl = (phone) => {
  let p = String(phone).replace(/[\s-]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '94' + p.slice(1);
  return p;
};

const sendOtpSms = async (phone, otp) => {
  const params = new URLSearchParams({
    user_id: process.env.NOTIFYLK_USER_ID,
    api_key: process.env.NOTIFYLK_API_KEY,
    sender_id: process.env.NOTIFYLK_SENDER_ID || 'NotifyDEMO',
    to: toIntl(phone),
    message: `MediQueue: your verification code is ${otp}. It expires in 10 minutes.`
  });

  const res = await fetch('https://app.notify.lk/api/v1/send', {
    method: 'POST',
    body: params
  });

  const data = await res.json();
  if (data.status !== 'success') {
    throw new Error(data.message || 'SMS sending failed');
  }
};

module.exports = { sendOtpSms };