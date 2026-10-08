const express = require('express');
const router = express.Router();
const waitingAreaController = require('../controllers/waitingAreaController');
const { verifyToken, roleGuard } = require('../middleware/auth');

// Authenticated users see only active waiting areas.
router.get('/', verifyToken, waitingAreaController.getWaitingAreas);
// Admin sees active and inactive waiting areas.
router.get('/admin/all', verifyToken, roleGuard(['admin']), waitingAreaController.getAllWaitingAreas);
// Admin-only CRUD
router.post('/', verifyToken, roleGuard(['admin']), waitingAreaController.createWaitingArea);
router.put('/:id', verifyToken, roleGuard(['admin']), waitingAreaController.updateWaitingArea);
router.delete('/:id', verifyToken, roleGuard(['admin']), waitingAreaController.deleteWaitingArea);
module.exports = router;
