const express = require('express');
const router = express.Router();

const controller = require('../controllers/admintokencontroller');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.use(verifyToken);
router.use(roleGuard(['admin', 'staff']));

// '/overview' must stay above '/:tokenId'
router.get('/overview', controller.getOverview);
router.get('/', controller.listTokens);
router.get('/:tokenId', controller.getToken);

module.exports = router;