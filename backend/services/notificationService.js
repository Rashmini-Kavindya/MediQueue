const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const AlertPreference = require('../models/AlertPreference');
const User = require('../models/User');
const { generateId } = require('../utils/id');
const { sendSms } = require('../utils/sendSms');

const createNotification = async ({
  userId,
  tokenId,
  type,
  message,
  channel = 'app'
}) => {
  const startTime = Date.now();

  try {
    // Same message eka eka token ekata aye aye save/SMS wenna epa
    const already = await Notification.findOne({ userId, tokenId, type, message, channel });
    if (already) return already;

    const notification = new Notification({
      notificationId: generateId('NTF'),
      userId,
      tokenId,
      type,
      message,
      channel,
      isRead: false,
      sentAt: new Date()
    });

    await notification.save();

    // SMS eka: account eke phone number ekata
    let deliveryStatus = 'sent';
    if (channel === 'app') {
      try {
        const user = await User.findOne({
          $or: [{ userId }, { patientId: userId }]
        });
        if (!user || !user.phone) throw new Error('User/phone not found');

        await sendSms(user.phone, `MediQueue: ${message}`);
      } catch (smsError) {
        console.error('SMS error:', smsError.message);
        deliveryStatus = 'failed';
      }
    }

    await NotificationLog.create({
      notificationId: notification.notificationId,
      channel,
      deliveryStatus,
      sentAt: new Date(),
      latencyMs: Date.now() - startTime
    });

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error.message);
    throw error;
  }
};

const getUserAlertPreference = async (userId) => {
  let preference = await AlertPreference.findOne({ userId });

  if (!preference) {
    preference = await AlertPreference.create({
      userId,
      threshold: 5,
      channels: ['app'],
      language: 'en'
    });
  }

  return preference;
};

const createQueueNotification = async ({ userId, tokenId, type, message }) => {
  const preference = await getUserAlertPreference(userId);

  const channels =
    preference.channels && preference.channels.length > 0
      ? preference.channels
      : ['app'];

  const notifications = [];

  for (const channel of channels) {
    const notification = await createNotification({
      userId,
      tokenId,
      type,
      message,
      channel
    });
    notifications.push(notification);
  }

  return notifications;
};

module.exports = {
  createNotification,
  getUserAlertPreference,
  createQueueNotification
};