const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.get('/', roomController.getRooms);
router.post('/', verifyToken, roleGuard(['admin', 'staff']), roomController.createRoom);
router.put('/:roomId', verifyToken, roleGuard(['admin', 'staff']), roomController.updateRoom);
router.delete('/:roomId', verifyToken, roleGuard(['admin', 'staff']), roomController.deleteRoom);

module.exports = router;