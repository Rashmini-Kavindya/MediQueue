
const express = require('express');

const router = express.Router();

const caregiverLinkController =
  require(
    '../controllers/caregiverLinkController'
  );

const {
  verifyToken,
  roleGuard
} = require('../middleware/auth');


// All caregiver routes require login
router.use(verifyToken);

// Caregiver profile management
router.use(
  '/account',
  require('./caregiverProfileSettingsRoutes')
);


// ======================================================
// CAREGIVER PATIENT CONSENT VERIFICATION
//
// POST /api/links/verification/start
// POST /api/links/verification/verify
//
// Must remain ABOVE /:id routes
// ======================================================

router.use(
  '/verification',
  require('./caregiverOtpRoutes')
);


// ======================================================
// PATIENT NAME SUGGESTIONS
//
// IMPORTANT:
// Must stay ABOVE /:id routes
//
// GET /api/links/patient-suggestions
// ======================================================

router.get(
  '/patient-suggestions',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.getPatientSuggestions
);


// ======================================================
// SEARCH PATIENT
//
// IMPORTANT:
// Must stay ABOVE /:id routes
//
// GET /api/links/search-patient
// ======================================================

router.get(
  '/search-patient',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.searchPatient
);


// ======================================================
// CREATE LINK
// POST /api/links
//
// Direct creation is disabled.
// Patient consent OTP verification is now required.
// ======================================================

router.post(
  '/',

  roleGuard([
    'caregiver'
  ]),

  (req, res) => {
    return res.status(403).json({
      success: false,
      message:
        'Patient consent verification is required. ' +
        'Use /api/links/verification/start and ' +
        '/api/links/verification/verify.'
    });
  }
);


// ======================================================
// GET LINKED PATIENTS
// GET /api/links
// ======================================================

router.get(
  '/',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.getLinkedPatients
);


// ======================================================
// GET LINKED PATIENT STATUS
// GET /api/links/:id/status
// ======================================================

router.get(
  '/:id/status',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.getLinkedPatientStatus
);


// ======================================================
// GET LINKED PATIENT NOTIFICATIONS
// GET /api/links/:id/notifications
// ======================================================

router.get(
  '/:id/notifications',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController
    .getLinkedPatientNotifications
);


// ======================================================
// UPDATE RELATIONSHIP
// PUT /api/links/:id
// ======================================================

router.put(
  '/:id',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.updateRelationship
);


// ======================================================
// DELETE LINK
// DELETE /api/links/:id
// ======================================================

router.delete(
  '/:id',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.unlinkPatient
);


module.exports = router;
