const express = require('express');
const router = express.Router();

const controller = require('../controllers/adminAlertPreferenceController');
const { verifyToken, roleGuard } = require('../middleware/auth');

router.use(verifyToken);
router.use(roleGuard(['admin']));

router.get('/', controller.listPreferences);
router.get('/:id', controller.getPreference);
router.put('/:id', controller.updatePreference);
router.delete('/:id', controller.deletePreference);

module.exports = router;