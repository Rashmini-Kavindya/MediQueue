const Notification = require('../models/Notification');

const getUserId = (req) => req.user.userId || req.user.id || req.user._id;

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