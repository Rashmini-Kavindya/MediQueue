const express = require('express');
const router = express.Router();

const queueController = require('../controllers/queueController');
const { verifyToken } = require('../middleware/auth');

router.get('/my-status', verifyToken, queueController.getMyQueueStatus);

const { emitQueueUpdate } = require('../services/queueEvents');

router.get('/live/:opdId', queueController.getLiveQueue);

//testing walata dagatta champage ekak
router.post('/test-trigger', async (req, res) => {
  try {
    const { opdId, token } = req.body;

    if (!opdId || !token) {
      return res.status(400).json({
        success: false,
        message: 'opdId and token details are required'
      });
    }

    // Socket update එකයි automatic notification logic එකයි trigger කරනවා
    await emitQueueUpdate(req.app.get('io'), opdId, token);

    res.status(200).json({
      success: true,
      message: 'Queue update and notifications triggered successfully!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});




module.exports = router;