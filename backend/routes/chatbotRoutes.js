const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { verifyToken } = require('../middleware/auth');

// Public or Authenticated Suggestion Endpoint
router.post('/suggest', (req, res, next) => {
  if (req.headers.authorization) {
    return verifyToken(req, res, next);
  }
  next();
}, chatbotController.suggestOpd);

// Authenticated User Chat History
router.get('/history', verifyToken, chatbotController.getChatHistory);
router.delete('/history/:logId', verifyToken, chatbotController.deleteChatLog);
router.delete('/history', verifyToken, chatbotController.clearAllHistory);
router.patch('/history/:logId', verifyToken, chatbotController.renameChatLog);

module.exports = router;