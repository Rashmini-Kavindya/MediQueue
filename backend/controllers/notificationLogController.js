const NotificationLog = require('../models/NotificationLog');
const Notification = require('../models/Notification');

// GET /api/notification-logs?status=&channel=&from=&to=&page=&limit=
exports.getNotificationLogs = async (req, res) => {
  try {
    const { status, channel, from, to } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    const filter = {};
    if (status) filter.deliveryStatus = status;
    if (channel) filter.channel = { $in: [channel.toLowerCase(), channel.toUpperCase()] };

    if (from || to) {
      filter.sentAt = {};
      if (from) filter.sentAt.$gte = new Date(from);
      if (to) filter.sentAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ sentAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NotificationLog.countDocuments(filter)
    ]);

    // Attach notification details so the admin can see what failed
    const ids = [...new Set(logs.map((l) => l.notificationId))];
    const notifications = await Notification.find({ notificationId: { $in: ids } })
      .select('notificationId title message type userId tokenId')
      .lean();
    const byId = new Map(notifications.map((n) => [n.notificationId, n]));

    const data = logs.map((log) => ({ ...log, notification: byId.get(log.notificationId) || null }));

    res.status(200).json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};