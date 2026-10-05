const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const AlertPreference = require('../models/AlertPreference');
const { generateId } = require('../utils/id');

const createNotification = async ({
  userId,
  tokenId,
  type,
  message,
  channel = 'app'
}) => {
  const startTime = Date.now();

  try {
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

    const latencyMs = Date.now() - startTime;

    await NotificationLog.create({
      notificationId: notification.notificationId,
      channel,
      deliveryStatus: 'sent',
      sentAt: new Date(),
      latencyMs
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


const createQueueNotification = async ({
  userId,
  tokenId,
  type,
  message
}) => {
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