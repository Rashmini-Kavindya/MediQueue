const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const { verifyToken, roleGuard } = require('../middleware/auth');

// ==========================================
// 1. PUBLIC ROUTES (Login අවශ්‍ය නොවන)
// ==========================================
// Public Tracking: trackingCode එකෙන් token status එක බැලීම
// GET /api/tokens/track/:trackingCode
router.get('/track/:trackingCode', tokenController.trackTokenStatus);

// ==========================================
// 2. AUTHENTICATED ROUTES (Login වී සිටිය යුතුය)
// ==========================================
router.use(verifyToken);

// Booking & User Token Routes
router.post('/', tokenController.bookToken);              // POST /api/tokens
router.get('/my', tokenController.getMyTokens);           // GET /api/tokens/my

// ==========================================
// 3. STAFF / OPD QUEUE ROUTES
// ==========================================
// යම් OPD එකකට අදාළ දවසේ Active Queue එක ලබාගැනීම
// GET /api/tokens/opd/:opdId
router.get('/opd/:opdId', tokenController.getOpdQueue);

// Specific Dynamic Token Routes (පෝලිමේ ගැටලු වළක්වා ගැනීමට පහළින් තබා ඇත)
router.get('/:tokenId', tokenController.getTokenById);    // GET /api/tokens/:tokenId
router.delete('/:tokenId', tokenController.cancelToken);  // DELETE /api/tokens/:tokenId

module.exports = router;