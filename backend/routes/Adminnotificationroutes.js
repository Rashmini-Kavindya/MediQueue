const express = require('express');
const router = express.Router();

const controller = require('../controllers/adminNotificationController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.use(verifyToken);
router.use(roleGuard(['admin']));

// '/stats' must stay above '/:id'
router.get('/stats', controller.getStats);

router.get('/', controller.listNotifications);
router.post('/', controller.createNotification);
router.get('/:id', controller.getNotification);
router.put('/:id', controller.updateNotification);
router.delete('/:id', controller.deleteNotification);

module.exports = router;