const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.use(verifyToken);
router.use(roleGuard(['admin']));
router.post('/', adminUserController.createStaffUser);
router.get('/', adminUserController.getUsers);
router.get('/:id', adminUserController.getUserById);
router.put('/:id', adminUserController.updateUser);
router.delete('/:id/permanent', adminUserController.permanentlyDeleteStaffUser);
router.delete('/:id', adminUserController.deactivateUser);
module.exports = router;
