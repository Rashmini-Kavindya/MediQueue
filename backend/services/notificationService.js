const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const NotificationTemplate = require('../models/NotificationTemplate');
const AlertPreference = require('../models/AlertPreference');
const User = require('../models/User');
const { generateId } = require('../utils/id');
const { sendSms: sendSmsMessage } = require('../utils/sendSms');

// true  = SMS only if the user enabled 'sms' in their alert preferences
// false = SMS always goes for important events (booked / near / called)
const SMS_REQUIRES_OPT_IN = true;

// Only these events are allowed to trigger an SMS
const SMS_TYPES = ['booked', 'near', 'called', 'TURN_NEAR', 'YOUR_TURN'];

// These are sent once per token (message text can change, e.g. patients ahead count)
const ONCE_PER_TOKEN_TYPES = ['booked', 'near', 'called', 'TURN_NEAR', 'YOUR_TURN'];

const TITLES = {
  booked: 'Token Booked',
  near: 'Your Turn Is Approaching',
  called: "It's Your Turn"
};

// English fallback when no active template exists in DB
const DEFAULT_MESSAGES = {
  booked: (v) => `Your token ${v.tokenNo || ''} has been booked successfully.`.replace('  ', ' '),
  near: (v) => `Your turn is approaching. ${v.patientsAhead} patient(s) ahead of you.`,
  called: (v) => `Your token ${v.tokenNo || ''} has been called. Please proceed${v.room ? ` to ${v.room}` : ''}.`.replace('  ', ' ')
};

const renderTemplate = (body, vars = {}) =>
  body.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? vars[key] : ''));

const resolveMessage = async (type, language, vars) => {
  const languages = language && language !== 'en' ? [language, 'en'] : ['en'];

  for (const lang of languages) {
    const template = await NotificationTemplate.findOne({ type, language: lang, status: 'active' });
    if (template) return renderTemplate(template.body, vars);
  }

  return DEFAULT_MESSAGES[type](vars);
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

const writeLog = async ({ notificationId, userId, channel, deliveryStatus, errorMessage = '', startTime }) => {
  try {
    await NotificationLog.create({
      notificationId,
      userId,
      channel,
      deliveryStatus,
      errorMessage,
      sentAt: new Date(),
      latencyMs: Date.now() - startTime
    });
  } catch (err) {
    console.error('Notification log error:', err.message);
  }
};

const deliverSms = async (notification) => {
  const { userId, message, notificationId } = notification;
  const preference = await getUserAlertPreference(userId);

  if (SMS_REQUIRES_OPT_IN && !(preference.channels || []).includes('sms')) {
    return; // user did not ask for SMS
  }

  const startTime = Date.now();
  try {
    const user = await User.findOne({ $or: [{ userId }, { patientId: userId }] });
    if (!user || !user.phone) throw new Error('User/phone not found');

    await sendSmsMessage(user.phone, `MediQueue: ${message}`);
    await writeLog({ notificationId, userId, channel: 'sms', deliveryStatus: 'sent', startTime });
  } catch (error) {
    console.error('SMS error:', error.message);
    await writeLog({
      notificationId,
      userId,
      channel: 'sms',
      deliveryStatus: 'failed',
      errorMessage: error.message,
      startTime
    });
  }
};

/**
 * Saves an in-app notification (always) and optionally sends an SMS.
 * SMS is only attempted when sendSms = true AND type is an SMS-worthy event.
 */
const createNotification = async ({
  userId,
  tokenId = '',
  type,
  title,
  room,
  message,
  source = 'system',
  sendSms = false,
  allowDuplicate = false
}) => {
  const startTime = Date.now();

  try {
    if (!allowDuplicate) {
      const filter = { userId, tokenId, type, channel: 'app' };
      if (!ONCE_PER_TOKEN_TYPES.includes(type)) filter.message = message;

      const already = await Notification.findOne(filter);
      if (already) return already;
    }

    const notification = await Notification.create({
      notificationId: generateId('NTF'),
      userId,
      tokenId,
      type,
      title: title || TITLES[type],
      room,
      message,
      channel: 'app',
      source,
      isRead: false,
      sentAt: new Date()
    });

    await writeLog({
      notificationId: notification.notificationId,
      userId,
      channel: 'app',
      deliveryStatus: 'sent',
      startTime
    });

    if (sendSms && SMS_TYPES.includes(type)) {
      await deliverSms(notification);
    }

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error.message);
    throw error;
  }
};

// ---- Event helpers (call these from token / queue code) ----

const notifyTokenBooked = async ({ userId, tokenId, tokenNo, opdName }) => {
  const preference = await getUserAlertPreference(userId);
  const message = await resolveMessage('booked', preference.language, { tokenNo, opdName });

  return createNotification({ userId, tokenId, type: 'booked', message, sendSms: true });
};

const notifyTurnNear = async ({ userId, tokenId, tokenNo, patientsAhead }) => {
  const preference = await getUserAlertPreference(userId);

  // Respect the user's own threshold
  if (patientsAhead > preference.threshold) return null;

  const message = await resolveMessage('near', preference.language, { tokenNo, patientsAhead });

  return createNotification({ userId, tokenId, type: 'near', message, sendSms: true });
};

const notifyTurnCalled = async ({ userId, tokenId, tokenNo, room }) => {
  const preference = await getUserAlertPreference(userId);
  const message = await resolveMessage('called', preference.language, { tokenNo, room });

  return createNotification({ userId, tokenId, type: 'called', room, message, sendSms: true });
};

// Backward compatible wrapper (old callers still work)
const createQueueNotification = async ({ userId, tokenId, type, message, title, room }) => {
  const notification = await createNotification({
    userId,
    tokenId,
    type,
    title,
    room,
    message,
    sendSms: SMS_TYPES.includes(type)
  });
  return [notification];
};

module.exports = {
  createNotification,
  createQueueNotification,
  getUserAlertPreference,
  notifyTokenBooked,
  notifyTurnNear,
  notifyTurnCalled
};