const express = require('express');
const router = express.Router();

const controller =
  require('../controllers/trackController');

router.get('/:trackingCode', controller.trackToken);

module.exports = router;