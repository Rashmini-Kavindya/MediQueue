const Notification = require('../models/Notification');


exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notifications = await Notification.find({
      userId
    }).sort({ sentAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Test එකට විතරක් manually notification එකක් දාන්න
exports.createNotification = async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const NotificationLog = require('../models/NotificationLog');

    const validTypes = Notification.schema.path('type').enumValues;
    const defaultType = validTypes && validTypes.length > 0 ? validTypes[0] : 'queue';

    // NotificationLog Schema එකේ තියෙන valid channel enums ටික auto ගන්නවා
    const validChannels = NotificationLog.schema.path('channel').enumValues;
    const defaultChannel = validChannels && validChannels.length > 0 ? validChannels[0] : 'SMS';

    const sampleNotificationId = 'NOTIF-' + Date.now();
    const sampleTokenId = 'TKN-' + Math.floor(1000 + Math.random() * 9000);
    const targetUserId = req.user ? (req.user.id || req.user._id || req.user.userId) : req.body.userId;

    // 1. Notification එක Save කිරීම
    const newNotification = new Notification({
      notificationId: sampleNotificationId,
      tokenId: sampleTokenId,
      userId: targetUserId,
      title: req.body.title || 'Test Alert',
      message: req.body.message || 'This is a test notification',
      type: defaultType,
      isRead: false
    });

    await newNotification.save();

    // 2. Notification Log එක Auto Save කිරීම
    const startTime = Date.now();
    
    await NotificationLog.create({
      notificationId: sampleNotificationId,
      userId: targetUserId,
      channel: defaultChannel, // Schema එකේ තියෙන නිවැරදි enum එක Auto යොදනු ලබයි
      status: 'delivered',
      latencyMs: Date.now() - startTime + 15,
      sentAt: new Date()
    });

    res.status(201).json({
      success: true,
      data: newNotification,
      message: 'Notification and Log created successfully!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOne({
      notificationId: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;

    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndDelete({
      notificationId: id,
      userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};