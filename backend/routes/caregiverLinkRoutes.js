const express = require('express');
const router = express.Router();

const caregiverLinkController = require('../controllers/caregiverLinkController');
const { verifyToken, roleGuard } = require('../middleware/auth');

// All caregiver link routes require authentication
router.use(verifyToken);

// CREATE - Link a patient
router.post(
  '/',
  roleGuard(['caregiver']),
  caregiverLinkController.linkPatient
);

// READ - View linked patients
router.get(
  '/',
  roleGuard(['caregiver']),
  caregiverLinkController.getLinkedPatients
);

// UPDATE - Edit relationship
router.put(
  '/:id',
  roleGuard(['caregiver']),
  caregiverLinkController.updateRelationship
);

// DELETE - Unlink patient
router.delete(
  '/:id',
  roleGuard(['caregiver']),
  caregiverLinkController.unlinkPatient
);

module.exports = router;