const express = require('express');
const router = express.Router();

const controller = require('../controllers/alertPreferenceController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', controller.getPreference);

router.post('/', controller.createOrUpdatePreference);

router.put('/', controller.createOrUpdatePreference);

module.exports = router;