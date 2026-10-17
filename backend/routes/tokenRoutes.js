const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.get('/track/:trackingCode', tokenController.trackTokenStatus);

router.use(verifyToken);

// Booking & User Token Routes
router.post('/', tokenController.bookToken);              // POST /api/tokens
router.get('/my', tokenController.getMyTokens);           // GET /api/tokens/my


router.get('/opd/:opdId', tokenController.getOpdQueue);
router.get('/:tokenId', tokenController.getTokenById);    // GET /api/tokens/:tokenId
router.delete('/:tokenId', tokenController.cancelToken);  // DELETE /api/tokens/:tokenId

module.exports = router;