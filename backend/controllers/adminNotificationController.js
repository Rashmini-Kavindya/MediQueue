const crypto = require('crypto');
const Notification = require('../models/Notification');
const NotificationLog = require('../models/NotificationLog');
const User = require('../models/User');

const MAX_BROADCAST = 2000;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPaging = (query, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

// Collision-safe ids (many are created in one go for broadcasts)
const newId = (prefix) => `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const isBroadcastId = (id) => typeof id === 'string' && id.startsWith('BRC-');

// recipientCount / readCount for a set of broadcasts (always unfiltered)
const getBroadcastCounts = async (broadcastIds) => {
  if (broadcastIds.length === 0) return new Map();

  const rows = await Notification.aggregate([
    { $match: { broadcastId: { $in: broadcastIds } } },
    {
      $group: {
        _id: '$broadcastId',
        recipientCount: { $sum: 1 },
        readCount: { $sum: { $cond: ['$isRead', 1, 0] } }
      }
    }
  ]);

  return new Map(rows.map((r) => [r._id, r]));
};

const asBroadcast = (doc, counts) => {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    isBroadcast: true,
    recipientCount: counts ? counts.recipientCount : 0,
    readCount: counts ? counts.readCount : 0
  };
};

// GET /api/admin/notifications?type=&channel=&isRead=&source=&userId=&search=&page=&limit=
// Group messages (broadcasts) appear once, not once per recipient.
exports.listNotifications = async (req, res) => {
  try {
    const { type, channel, isRead, source, userId, search } = req.query;
    const { page, limit, skip } = getPaging(req.query);

    const filter = {};
    if (type) filter.type = type;
    if (channel) filter.channel = channel;
    if (source) filter.source = source;
    if (userId) filter.userId = userId;
    if (isRead === 'true' || isRead === 'false') filter.isRead = isRead === 'true';

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: rx }, { message: rx }, { userId: rx }, { tokenId: rx }];
    }

    const result = await Notification.aggregate([
      { $match: filter },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: { $ifNull: ['$broadcastId', '$notificationId'] },
          doc: { $first: '$$ROOT' }
        }
      },
      { $sort: { 'doc.sentAt': -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }]
        }
      }
    ]).allowDiskUse(true);

    const rows = (result[0].data || []).map((r) => r.doc);
    const total = result[0].total[0] ? result[0].total[0].count : 0;

    const counts = await getBroadcastCounts(rows.filter((r) => r.broadcastId).map((r) => r.broadcastId));

    const data = rows.map((r) => (r.broadcastId ? asBroadcast(r, counts.get(r.broadcastId)) : r));

    res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/notifications/stats
exports.getStats = async (req, res) => {
  try {
    const [total, unread, byType, deliveryRows] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: false }),
      Notification.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      NotificationLog.aggregate([
        {
          $group: {
            _id: { channel: '$channel', status: '$deliveryStatus' },
            count: { $sum: 1 },
            avgLatency: { $avg: '$latencyMs' }
          }
        }
      ])
    ]);

    const delivery = { sent: 0, failed: 0, pending: 0 };
    const sms = { sent: 0, failed: 0, pending: 0 };
    let latencySum = 0;
    let logTotal = 0;

    deliveryRows.forEach((row) => {
      const { channel, status } = row._id;
      delivery[status] = (delivery[status] || 0) + row.count;
      latencySum += (row.avgLatency || 0) * row.count;
      logTotal += row.count;

      if (String(channel).toLowerCase() === 'sms') {
        sms[status] = (sms[status] || 0) + row.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: { total, unread },
        delivery: {
          ...delivery,
          total: logTotal,
          successRate: logTotal ? Math.round((delivery.sent / logTotal) * 100) : 0,
          avgLatencyMs: logTotal ? Math.round(latencySum / logTotal) : 0
        },
        sms,
        byType: byType.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {})
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/notifications/:id   (:id = notificationId or broadcastId)
exports.getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (isBroadcastId(id)) {
      const representative = await Notification.findOne({ broadcastId: id }).sort({ sentAt: -1 }).lean();

      if (!representative) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      const counts = await getBroadcastCounts([id]);
      const notificationIds = await Notification.find({ broadcastId: id }).distinct('notificationId');

      const summaryRows = await NotificationLog.aggregate([
        { $match: { notificationId: { $in: notificationIds } } },
        { $group: { _id: { channel: '$channel', deliveryStatus: '$deliveryStatus' }, count: { $sum: 1 } } }
      ]);

      return res.status(200).json({
        success: true,
        data: {
          notification: asBroadcast(representative, counts.get(id)),
          logSummary: summaryRows.map((r) => ({
            channel: r._id.channel,
            deliveryStatus: r._id.deliveryStatus,
            count: r.count
          }))
        }
      });
    }

    const notification = await Notification.findOne({ notificationId: id });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const logs = await NotificationLog.find({ notificationId: notification.notificationId }).sort({ sentAt: -1 });

    res.status(200).json({ success: true, data: { notification, logs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/notifications   body: { userId } or { role } (role 'all' = every active user), title?, message
exports.createNotification = async (req, res) => {
  try {
    const { userId, role, title, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    if (!userId && !role) {
      return res.status(400).json({ success: false, message: 'Provide a userId or a role' });
    }

    let recipients = [];
    let broadcastId;
    let audience = 'user';

    if (userId) {
      const exists = await User.exists({ userId });
      if (!exists) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      recipients = [userId];
    } else {
      const userFilter = { status: 'active' };
      if (role !== 'all') userFilter.role = role;

      const users = await User.find(userFilter).select('userId').limit(MAX_BROADCAST);
      recipients = users.map((u) => u.userId).filter(Boolean);

      if (recipients.length === 0) {
        return res.status(404).json({
          success: false,
          message: role === 'all' ? 'No active users found' : `No active users found for role "${role}"`
        });
      }

      broadcastId = newId('BRC');
      audience = role === 'all' ? 'all' : `role:${role}`;
    }

    const now = new Date();
    const finalTitle = (title && title.trim()) || 'Announcement';

    const notifications = recipients.map((target) => ({
      notificationId: newId('NTF'),
      userId: target,
      tokenId: '',
      type: 'update',
      title: finalTitle,
      message: message.trim(),
      channel: 'app',
      source: 'admin',
      broadcastId,
      audience,
      isRead: false,
      sentAt: now
    }));

    await Notification.insertMany(notifications, { ordered: false });

    // One "sent" log per copy so delivery stats stay accurate
    await NotificationLog.insertMany(
      notifications.map((n) => ({
        notificationId: n.notificationId,
        userId: n.userId,
        channel: 'app',
        deliveryStatus: 'sent',
        latencyMs: 0,
        sentAt: now
      })),
      { ordered: false }
    );

    res.status(201).json({
      success: true,
      data: { requested: recipients.length, created: notifications.length, broadcastId },
      message: `Notification sent to ${notifications.length} user(s)`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/notifications/:id   body: { title?, message?, isRead? }
// For a broadcast, title / message change for every recipient.
exports.updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, isRead } = req.body;

    if (message !== undefined && !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    if (isBroadcastId(id)) {
      const update = {};
      if (title !== undefined) update.title = title;
      if (message !== undefined) update.message = String(message).trim();

      const matched = await Notification.updateMany({ broadcastId: id }, { $set: update });
      if (matched.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      const representative = await Notification.findOne({ broadcastId: id }).sort({ sentAt: -1 }).lean();
      const counts = await getBroadcastCounts([id]);

      return res.status(200).json({
        success: true,
        data: asBroadcast(representative, counts.get(id)),
        message: 'Notification updated for all recipients'
      });
    }

    const notification = await Notification.findOne({ notificationId: id });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (title !== undefined) notification.title = title;
    if (message !== undefined) notification.message = String(message).trim();
    if (isRead !== undefined) notification.isRead = !!isRead;

    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/notifications/:id   (logs are kept for audit)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (isBroadcastId(id)) {
      const result = await Notification.deleteMany({ broadcastId: id });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      return res.status(200).json({
        success: true,
        message: `Notification deleted for ${result.deletedCount} user(s)`
      });
    }

    const notification = await Notification.findOneAndDelete({ notificationId: id });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};