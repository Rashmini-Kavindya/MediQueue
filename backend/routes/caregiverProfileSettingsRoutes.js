const express = require('express');
const router = express.Router();
const { roleGuard } = require('../middleware/auth');
const c = require('../controllers/caregiverProfileSettingsController');

// Mounted under the already authenticated /api/links router.
router.use(roleGuard(['caregiver']));
router.get('/', c.getSettings);
router.put('/name', c.saveName);
router.put('/photo', c.savePhoto);
router.post('/phone/start', c.startPhoneChange);
router.post('/phone/verify', c.verifyPhoneChange);
module.exports = router;
