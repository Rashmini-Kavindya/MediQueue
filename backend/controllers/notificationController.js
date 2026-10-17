const Notification = require('../models/Notification');
const User = require('../models/User');
const { generateId } = require('../utils/id');

const getUserId = (req) => req.user.userId || req.user.id || req.user._id;

const MAX_MESSAGE_LENGTH = 500;

// ---------- Validation for messages sent to admins ----------
const CATEGORIES = {
  queue: 'Queue issue',
  token: 'Token problem',
  technical: 'Technical problem',
  feedback: 'Feedback / Complaint',
  other: 'Other'
};
const PRIORITIES = ['normal', 'urgent'];

const SUBJECT_MIN = 3;
const SUBJECT_MAX = 80;
const MESSAGE_MIN = 10;

// Sri Lankan mobile: 07XXXXXXXX or +947XXXXXXXX or 947XXXXXXXX
const PHONE_REGEX = /^(?:\+94|94|0)7\d{8}$/;
const TOKEN_REGEX = /^[A-Za-z0-9-]{1,20}$/;

// Returns { errors, value }. errors is {} when everything is valid.
const validateMessagePayload = (body = {}) => {
  const errors = {};

  const category = String(body.category || '').trim();
  const subject = String(body.subject || '').trim().replace(/\s+/g, ' ');
  const message = String(body.message || '').trim();
  const priority = String(body.priority || 'normal').trim().toLowerCase();
  const contactPhone = String(body.contactPhone || '').replace(/[\s-]/g, '');
  const relatedToken = String(body.relatedToken || '').trim().toUpperCase();

  if (!category) errors.category = 'Please select a category';
  else if (!CATEGORIES[category]) errors.category = 'Invalid category';

  if (!subject) errors.subject = 'Subject is required';
  else if (subject.length < SUBJECT_MIN) errors.subject = `Subject must be at least ${SUBJECT_MIN} characters`;
  else if (subject.length > SUBJECT_MAX) errors.subject = `Subject must be ${SUBJECT_MAX} characters or less`;

  if (!message) errors.message = 'Message is required';
  else if (message.length < MESSAGE_MIN) errors.message = `Message must be at least ${MESSAGE_MIN} characters`;
  else if (message.length > MAX_MESSAGE_LENGTH) errors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;

  if (!PRIORITIES.includes(priority)) errors.priority = 'Invalid priority';

  if (contactPhone && !PHONE_REGEX.test(contactPhone)) {
    errors.contactPhone = 'Enter a valid mobile number (e.g. 0771234567)';
  }

  if (relatedToken && !TOKEN_REGEX.test(relatedToken)) {
    errors.relatedToken = 'Token number can only contain letters, numbers and "-" (max 20)';
  }

  return {
    errors,
    value: { category, subject, message, priority, contactPhone, relatedToken }
  };
};

const buildTitle = ({ priority, category, subject }, senderName) =>
  `${priority === 'urgent' ? 'URGENT • ' : ''}${CATEGORIES[category]}: ${subject} — ${senderName}`;

// GET /api/notifications            -> all my notifications (newest first)
// GET /api/notifications?limit=8    -> latest N only
// Always returns unreadCount (total unread, not just the page)
exports.getNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = parseInt(req.query.limit, 10);

    const query = Notification.find({ userId }).sort({ sentAt: -1 });
    if (limit > 0) query.limit(Math.min(limit, 100));

    const [notifications, unreadCount] = await Promise.all([
      query,
      Notification.countDocuments({ userId, isRead: false })
    ]);

    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/read-all   -> marks only MY unread notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: getUserId(req), isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      data: { updated: result.modifiedCount },
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      notificationId: req.params.id,
      userId: getUserId(req)
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      notificationId: req.params.id,
      userId: getUserId(req)
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/clear-all -> deletes only MY notifications
exports.clearAll = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ userId: getUserId(req) });

    res.status(200).json({
      success: true,
      data: { deleted: result.deletedCount },
      message: 'All notifications cleared'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications/message-admin
// body: { category, subject, message, priority?, contactPhone?, relatedToken? }
// Each active admin gets their own copy.
exports.sendMessageToAdmin = async (req, res) => {
  try {
    const senderId = getUserId(req);

    const { errors, value } = validateMessagePayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: Object.values(errors)[0],
        errors
      });
    }

    const sender = await User.findOne({ userId: senderId });
    const senderName = sender
      ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'User'
      : 'User';

    const admins = await User.find({ role: 'admin', status: { $ne: 'inactive' } });
    if (admins.length === 0) {
      return res.status(404).json({ success: false, message: 'No admin available right now' });
    }

    const broadcastId = generateId('BRD');
    const title = buildTitle(value, senderName);

    const docs = admins.map((admin) => ({
      notificationId: generateId('NTF'),
      userId: admin.userId,
      title,
      type: 'USER_MESSAGE',
      message: value.message,
      category: value.category,
      priority: value.priority,
      subject: value.subject,
      contactPhone: value.contactPhone,
      relatedToken: value.relatedToken,
      channel: 'app',
      broadcastId,
      audience: 'role:admin',
      source: 'user',
      senderId,
      senderName
    }));

    await Notification.insertMany(docs);

    res.status(201).json({
      success: true,
      data: { broadcastId },
      message: 'Message sent to admin'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getMySentMessages = async (req, res) => {
  try {
    const senderId = getUserId(req);

    const docs = await Notification.find({
      source: 'user',
      type: 'USER_MESSAGE',
      senderId
    }).sort({ sentAt: -1 });

    const grouped = new Map();
    docs.forEach((doc) => {
      const key = doc.broadcastId || doc.notificationId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          broadcastId: key,
          category: doc.category || 'other',
          priority: doc.priority || 'normal',
          subject: doc.subject || '',
          contactPhone: doc.contactPhone || '',
          relatedToken: doc.relatedToken || '',
          message: doc.message,
          sentAt: doc.sentAt,
          editedAt: doc.editedAt || null,
          recipients: 0,
          readCount: 0
        });
      }
      const entry = grouped.get(key);
      entry.recipients += 1;
      if (doc.isRead) entry.readCount += 1;
    });

    res.status(200).json({ success: true, data: Array.from(grouped.values()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.editSentMessage = async (req, res) => {
  try {
    const senderId = getUserId(req);

    const { errors, value } = validateMessagePayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: Object.values(errors)[0],
        errors
      });
    }

    const filter = {
      broadcastId: req.params.broadcastId,
      source: 'user',
      type: 'USER_MESSAGE',
      senderId
    };

    const existing = await Notification.findOne(filter);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await Notification.updateMany(filter, {
      $set: {
        title: buildTitle(value, existing.senderName || 'User'),
        message: value.message,
        category: value.category,
        priority: value.priority,
        subject: value.subject,
        contactPhone: value.contactPhone,
        relatedToken: value.relatedToken,
        isRead: false,
        editedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      data: { broadcastId: req.params.broadcastId },
      message: 'Message updated'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/my-messages/:broadcastId
// Removes the message from every admin's inbox. Only the original sender can do this.
exports.deleteSentMessage = async (req, res) => {
  try {
    const senderId = getUserId(req);

    const result = await Notification.deleteMany({
      broadcastId: req.params.broadcastId,
      source: 'user',
      type: 'USER_MESSAGE',
      senderId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};