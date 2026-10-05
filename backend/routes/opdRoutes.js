const express = require('express');
const router = express.Router();
const opdController = require('../controllers/opdController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.get('/', opdController.getOpds);
router.post('/', verifyToken, roleGuard(['admin', 'staff']), opdController.createOpd);
router.put('/:opdId', verifyToken, roleGuard(['admin', 'staff']), opdController.updateOpd);
router.delete('/:opdId', verifyToken, roleGuard(['admin', 'staff']), opdController.deleteOpd);

module.exports = router;