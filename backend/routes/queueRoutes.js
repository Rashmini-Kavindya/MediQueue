const express = require('express');
const router = express.Router();

const { verifyToken, roleGuard } = require('../middleware/auth');
const {
  callNext,
  holdToken,
  skipToken,
  recallToken,
  getMyQueueStatus,
  getLiveQueue
} = require('../controllers/queueController');

// ---- Patient / any logged-in user ----
router.get('/my-status', verifyToken, getMyQueueStatus);
router.get('/live/:opdId', verifyToken, getLiveQueue);

// ---- Staff / admin ----
router.post('/call-next', verifyToken, roleGuard(['staff', 'admin']), callNext);
router.put('/:tokenId/hold', verifyToken, roleGuard(['staff', 'admin']), holdToken);
router.put('/:tokenId/skip', verifyToken, roleGuard(['staff', 'admin']), skipToken);
router.put('/:tokenId/recall', verifyToken, roleGuard(['staff', 'admin']), recallToken);

module.exports = router;