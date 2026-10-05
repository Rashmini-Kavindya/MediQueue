const express = require('express');
const router = express.Router();

const caregiverLinkController = require(
  '../controllers/caregiverLinkController'
);

const {
  verifyToken,
  roleGuard
} = require('../middleware/auth');


// All caregiver-link routes require authentication
router.use(verifyToken);


// ======================================================
// CREATE - Link a patient
// POST /api/links
// ======================================================
router.post(
  '/',
  roleGuard(['caregiver']),
  caregiverLinkController.linkPatient
);


// ======================================================
// READ - View caregiver's linked patients
// GET /api/links
// ======================================================
router.get(
  '/',
  roleGuard(['caregiver']),
  caregiverLinkController.getLinkedPatients
);


// ======================================================
// READ - Linked patient's token + live queue
// GET /api/links/:id/status
// ======================================================
router.get(
  '/:id/status',
  roleGuard(['caregiver']),
  caregiverLinkController.getLinkedPatientStatus
);


// ======================================================
// READ - Linked patient's notifications
// GET /api/links/:id/notifications
// ======================================================
router.get(
  '/:id/notifications',
  roleGuard(['caregiver']),
  caregiverLinkController.getLinkedPatientNotifications
);


// ======================================================
// UPDATE - Edit caregiver relationship
// PUT /api/links/:id
// ======================================================
router.put(
  '/:id',
  roleGuard(['caregiver']),
  caregiverLinkController.updateRelationship
);


// ======================================================
// DELETE - Unlink patient
// DELETE /api/links/:id
// ======================================================
router.delete(
  '/:id',
  roleGuard(['caregiver']),
  caregiverLinkController.unlinkPatient
);


module.exports = router;