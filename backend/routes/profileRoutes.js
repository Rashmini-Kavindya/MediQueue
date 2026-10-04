const express = require('express');
const router = express.Router();

const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// Profile
router.get('/me', profileController.getProfile);
router.put('/me', profileController.updateProfile);
router.delete('/me', profileController.deactivateAccount);

// Preferences
router.get('/me/preferences', profileController.getPreferences);
router.put('/me/preferences', profileController.updatePreferences);

module.exports = router;