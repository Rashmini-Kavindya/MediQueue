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
// ======================================================

router.post(
  '/',

  roleGuard([
    'caregiver'
  ]),

  caregiverLinkController.linkPatient
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