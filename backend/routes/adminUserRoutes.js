const express = require('express');
const router = express.Router();

const adminUserController = require('../controllers/adminUserController');
const { verifyToken, roleGuard } = require('../middleware/auth');

// Every route here requires login + admin role
router.use(verifyToken);
router.use(roleGuard(['admin']));

// CREATE - Add staff account
router.post('/', adminUserController.createStaffUser);

// READ - List/search all users
router.get('/', adminUserController.getUsers);

// READ - View one user
router.get('/:id', adminUserController.getUserById);

// UPDATE - Edit user
router.put('/:id', adminUserController.updateUser);

// DELETE - Soft deactivate user
router.delete('/:id', adminUserController.deactivateUser);

module.exports = router;