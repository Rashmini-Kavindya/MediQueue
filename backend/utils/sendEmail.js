const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"MediQueue" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your MediQueue verification code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px">
        <h2 style="color:#0052CC">MediQueue</h2>
        <p>Your verification code is:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:6px">${otp}</p>
        <p style="color:#64748B;font-size:13px">This code expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>`
  });
};

module.exports = { sendOtpEmail };