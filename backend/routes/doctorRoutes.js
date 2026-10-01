const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.get('/', doctorController.getDoctors);
router.post('/', verifyToken, roleGuard(['admin', 'staff']), doctorController.createDoctor);

module.exports = router;