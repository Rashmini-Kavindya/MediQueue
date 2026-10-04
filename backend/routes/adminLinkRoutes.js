const express = require('express');
const router = express.Router();

const caregiverLinkController = require('../controllers/caregiverLinkController');
const { verifyToken, roleGuard } = require('../middleware/auth');

// All admin link routes require authentication
router.use(verifyToken);

// Admin only - Verify or reject caregiver link
router.put(
  '/:id/verify',
  roleGuard(['admin']),
  caregiverLinkController.verifyLink
);

module.exports = router;