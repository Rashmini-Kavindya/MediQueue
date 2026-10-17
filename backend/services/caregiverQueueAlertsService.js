// Caregiver-owned, read-only view of linked patients' queue notifications.
// IMPORTANT: Never return the patient's full notification history here.
// Patient OTP messages and personal notifications must remain private.
const User = require('../models/User');
const Token = require('../models/Token');
const Notification = require('../models/Notification');

const QUEUE_TYPES = [
  'near', 'called', 'update',
  'QUEUE_UPDATE', 'YOUR_TURN', 'TURN_NEAR'
];

const getCaregiverSafeQueueNotifications = async (patientId) => {
  const patient = await User.findOne({
    patientId,
    role: 'patient',
    status: 'active'
  }).select('userId patientId firstName lastName status');

  if (!patient) return { patient: null, notifications: [] };

  // A consent verification ID (CLV-...) or caregiver link ID (LNK-...)
  // is never an actual queue token ID (TKN-...). This is the key boundary.
  const tokenIds = await Token.distinct('tokenId', { patientId });
  if (!tokenIds.length) {
    return { patient, notifications: [] };
  }

  const notifications = await Notification.find({
    userId: patient.userId,
    tokenId: { $in: tokenIds },
    type: { $in: QUEUE_TYPES }
  })
    .select('notificationId tokenId title type message channel isRead sentAt')
    .sort({ sentAt: -1 })
    .limit(100)
    .lean();

  // Extra defense in depth: no caregiver consent messages or codes.
  const safeNotifications = notifications.filter((item) => {
    const text = `${item.title || ''} ${item.message || ''}`;
    return !/caregiver link|consent code|verification code|\botp\b/i.test(text);
  });

  return { patient, notifications: safeNotifications };
};

module.exports = { getCaregiverSafeQueueNotifications };
