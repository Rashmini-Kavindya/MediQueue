const express = require('express');
const router = express.Router();

const controller =
  require('../controllers/notificationLogController');

const {
  verifyToken,
  roleGuard
} = require('../middleware/auth');

router.get(
  '/',
  verifyToken,
  roleGuard(['admin']),
  controller.getNotificationLogs
);

module.exports = router;