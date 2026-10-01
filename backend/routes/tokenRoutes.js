const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const { verifyToken } = require('../middleware/auth');

// All token routes require login
router.use(verifyToken);

router.post('/', tokenController.bookToken);              // POST /api/tokens
router.get('/my', tokenController.getMyTokens);           // GET /api/tokens/my
router.get('/:tokenId', tokenController.getTokenById);    // GET /api/tokens/:tokenId
router.delete('/:tokenId', tokenController.cancelToken);  // DELETE /api/tokens/:tokenId

module.exports = router;