const Token = require('../models/Token');
const OPD = require('../models/OPD');


exports.trackToken = async (req, res) => {
  try {
    const { trackingCode } = req.params;

    const token = await Token.findOne({
      trackingCode
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Tracking code not found'
      });
    }

    const opd = await OPD.findOne({
      opdId: token.opdId
    });

    const patientsAhead = await Token.countDocuments({
      opdId: token.opdId,
      queueDate: token.queueDate,
      tokenSequence: {
        $lt: token.tokenSequence
      },
      status: {
        $in: [
          'waiting',
          'called',
          'hold',
          'in-consultation'
        ]
      }
    });

    const estimatedWaitMinutes =
      patientsAhead *
      (opd?.avgConsultMinutes || 10);

    res.status(200).json({
      success: true,
      data: {
        tokenNo: token.tokenNo,
        status: token.status,
        opdId: token.opdId,
        queueDate: token.queueDate,
        patientsAhead,
        estimatedWaitMinutes,
        trackingCode: token.trackingCode
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};