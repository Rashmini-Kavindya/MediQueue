const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', notificationController.getNotifications);

// Messages I sent to the admins (keep these above the '/:id' routes)
router.get('/my-messages', notificationController.getMySentMessages);
router.put('/my-messages/:broadcastId', notificationController.editSentMessage);
router.delete('/my-messages/:broadcastId', notificationController.deleteSentMessage);

router.post('/message-admin', notificationController.sendMessageToAdmin);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/clear-all', notificationController.clearAll);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;