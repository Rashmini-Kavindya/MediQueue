const express = require('express');
const router = express.Router();

const waitingAreaController = require('../controllers/waitingAreaController');
const { verifyToken, roleGuard } = require('../middleware/auth');

// User side - authenticated users can view active waiting areas
router.get(
  '/',
  verifyToken,
  waitingAreaController.getWaitingAreas
);

// Admin - view all areas
router.get(
  '/admin/all',
  verifyToken,
  roleGuard(['admin']),
  waitingAreaController.getAllWaitingAreas
);

// Admin - create
router.post(
  '/',
  verifyToken,
  roleGuard(['admin']),
  waitingAreaController.createWaitingArea
);

// Admin - update
router.put(
  '/:id',
  verifyToken,
  roleGuard(['admin']),
  waitingAreaController.updateWaitingArea
);

// Admin - delete
router.delete(
  '/:id',
  verifyToken,
  roleGuard(['admin']),
  waitingAreaController.deleteWaitingArea
);

module.exports = router;