const express = require('express');
const router = express.Router();

const controller =
  require('../controllers/reportController');

const {
  verifyToken,
  roleGuard
} = require('../middleware/auth');

router.use(verifyToken);
router.use(roleGuard(['admin']));

router.get('/summary', controller.getSummary);

router.get('/daily', controller.getDailyReport);

module.exports = router;