
const express = require('express');
const router = express.Router();

const caregiverOtpController =
  require('../controllers/caregiverOtpController');

const { roleGuard } = require('../middleware/auth');

// Authentication is handled by caregiverLinkRoutes.js.
// Only logged-in caregivers may use these endpoints.

// START / REQUEST NEW OTP
router.post(
  '/start',
  roleGuard(['caregiver']),
  caregiverOtpController.startVerification
);

// VERIFY OTP AND ACTIVATE PATIENT LINK
router.post(
  '/verify',
  roleGuard(['caregiver']),
  caregiverOtpController.verifyCode
);

module.exports = router;
