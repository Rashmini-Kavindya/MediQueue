const NotificationLog =
  require('../models/NotificationLog');


exports.getNotificationLogs = async (req, res) => {
  try {
    const logs =
      await NotificationLog.find()
        .sort({ sentAt: -1 })
        .limit(200);

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};