const Token = require('../models/Token');
const OPD = require('../models/OPD');

/* ===================== MY PART (call / hold / skip / recall) ===================== */

const callNext = async (req, res) => {
  try {
    const { opdId, queueDate } = req.body;

    if (!opdId) {
      return res.status(400).json({
        success: false,
        message: 'opdId is required'
      });
    }

    const date =
      queueDate || new Date().toISOString().split('T')[0];

    const token = await Token.findOneAndUpdate(
      {opdId, queueDate: date, status: 'waiting'},
      { $set: { status: 'called', calledAt: new Date()}},
      {new: true, sort: { priority: -1, tokenSequence: 1 } } 
    );

    if (!token) {
      return res.status(404).json({ success: false, message: 'No waiting tokens found for this OPD' });
    }

    return res.status(200).json({
      success: true, data: token, message: `Token ${token.tokenNo} called successfully`}
    );

  } catch (error) {
    console.error('Call next error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to call next token'
    });
  }
};

// Function to put a called token on hold
const holdToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findOneAndUpdate(
      {
        tokenId,
        status: 'called'
      },
      {
        $set: {
          status: 'hold'
        }
      },
      {
        new: true
      }
    );

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Called token not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: token,
      message: `Token ${token.tokenNo} put on hold successfully`
    });

  } catch (error) {
    console.error('Hold token error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to put token on hold'
    });
  }
};

const skipToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findOneAndUpdate(
      { tokenId, status: 'called'},
      { $set: { status: 'skipped'}},
      {new: true}
    );

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Called token not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: token,
      message: `Token ${token.tokenNo} skipped successfully`
    });

  } catch (error) {
    console.error('Skip token error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to skip token'
    });
  }
};

const recallToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await Token.findOneAndUpdate(
      {
        tokenId,
        status: 'hold'
      },
      {
        $set: {
          status: 'called',
          calledAt: new Date()
        }
      },
      {
        new: true
      }
    );

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Held token not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: token,
      message: `Token ${token.tokenNo} recalled successfully`
    });

  } catch (error) {
    console.error('Recall token error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to recall token'
    });
  }
};

/* ===================== MINURI'S PART (frontend/minuri) ===================== */

const getMyQueueStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const tokens = await Token.find({
      userId,
      status: {
        $in: [
          'waiting',
          'called',
          'hold',
          'in-consultation'
        ]
      }
    }).sort({ createdAt: -1 });

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active queue found'
      });
    }

    const activeQueuesList = [];

    for (const token of tokens) {
      const opd = await OPD.findOne({
        opdId: token.opdId
      });

      if (!opd) continue;

      const patientsAhead = await Token.countDocuments({
        opdId: token.opdId,
        queueDate: token.queueDate,
        tokenSequence: { $lt: token.tokenSequence },
        status: {
          $in: [
            'waiting',
            'called',
            'hold',
            'in-consultation'
          ]
        }
      });

      const estimatedWaitTime =
        patientsAhead * (opd.avgConsultMinutes || 10);

      activeQueuesList.push({
        tokenId: token.tokenId,
        tokenNo: token.tokenNo,
        opdId: token.opdId,
        opdName: opd.name,
        room: opd.room || 'Room 01',
        queueDate: token.queueDate,
        status: token.status,
        patientsAhead,
        estimatedWaitMinutes: estimatedWaitTime,
        trackingCode: token.trackingCode
      });
    }

    res.status(200).json({
      success: true,
      data: activeQueuesList
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


const getLiveQueue = async (req, res) => {
  try {
    const { opdId } = req.params;

    const opd = await OPD.findOne({ opdId });

    if (!opd) {
      return res.status(404).json({
        success: false,
        message: 'OPD not found'
      });
    }

    const queueDate =
      req.query.date ||
      new Date().toISOString().split('T')[0];

    const tokens = await Token.find({
      opdId,
      queueDate,
      status: {
        $in: [
          'waiting',
          'called',
          'hold',
          'in-consultation'
        ]
      }
    })
      .sort({ tokenSequence: 1 })
      .select(
        'tokenId tokenNo tokenSequence status queueDate opdId'
      );

    const currentToken = tokens.find(
      token => token.status === 'called' || token.status === 'in-consultation'
    );

    res.status(200).json({
      success: true,
      data: {
        opdId,
        opdName: opd.name,
        queueDate,
        currentToken: currentToken
          ? currentToken.tokenNo
          : null,
        totalWaiting: tokens.filter(
          token => token.status === 'waiting'
        ).length,
        queue: tokens
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  callNext,
  holdToken,
  skipToken,
  recallToken,
  getMyQueueStatus,
  getLiveQueue
};