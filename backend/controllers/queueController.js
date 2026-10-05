const Token = require('../models/Token');

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

module.exports = {
  callNext,
  holdToken,
  skipToken,
  recallToken
};