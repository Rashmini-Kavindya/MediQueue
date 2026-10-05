const express = require('express');
const router = express.Router();

const { verifyToken, roleGuard } = require('../middleware/auth');
const { callNext, holdToken, skipToken, recallToken } = require('../controllers/queueController');

router.post(
  '/call-next',
  verifyToken,
  roleGuard(['staff', 'admin']),
  callNext
);
router.put(
  '/:tokenId/hold',
  verifyToken,
  roleGuard(['staff', 'admin']),
  holdToken
);

router.put(
  '/:tokenId/skip',
  verifyToken,
  roleGuard(['staff', 'admin']),
  skipToken
);

router.put(
  '/:tokenId/recall',
  verifyToken,
  roleGuard(['staff', 'admin']),
  recallToken
);

module.exports = router;