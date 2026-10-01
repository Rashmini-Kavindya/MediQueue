const express = require('express');
const router = express.Router();
const opdController = require('../controllers/opdController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.get('/', opdController.getOpds);
router.post('/', verifyToken, roleGuard(['admin', 'staff']), opdController.createOpd);

module.exports = router;