const Token = require('../models/Token');
const NotificationLog = require('../models/NotificationLog');


exports.getSummary = async (req, res) => {
  try {
    const date =
      req.query.date ||
      new Date().toISOString().split('T')[0];

    const totalTokens = await Token.countDocuments({
      queueDate: date
    });

    const completedTokens = await Token.countDocuments({
      queueDate: date,
      status: 'completed'
    });

    const cancelledTokens = await Token.countDocuments({
      queueDate: date,
      status: 'cancelled'
    });

    const waitingTokens = await Token.countDocuments({
      queueDate: date,
      status: 'waiting'
    });

    const calledTokens = await Token.countDocuments({
      queueDate: date,
      status: 'called'
    });

    const notificationsSent =
      await NotificationLog.countDocuments({
        deliveryStatus: 'sent',
        sentAt: {
          $gte: new Date(`${date}T00:00:00`),
          $lte: new Date(`${date}T23:59:59`)
        }
      });

    res.status(200).json({
      success: true,
      data: {
        date,
        totalTokens,
        completedTokens,
        cancelledTokens,
        waitingTokens,
        calledTokens,
        notificationsSent
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getDailyReport = async (req, res) => {
  try {
    const date =
      req.query.date ||
      new Date().toISOString().split('T')[0];

    const report = await Token.aggregate([
      {
        $match: {
          queueDate: date
        }
      },
      {
        $group: {
          _id: '$opdId',
          totalPatients: {
            $sum: 1
          },
          completed: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                1,
                0
              ]
            }
          },
          cancelled: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'cancelled'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: {
          totalPatients: -1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        date,
        report
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};