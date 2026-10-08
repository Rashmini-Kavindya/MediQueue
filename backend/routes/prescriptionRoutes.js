const express = require('express');
const router = express.Router();

const {
  verifyToken,
  roleGuard
} = require('../middleware/auth');

const {
  createPrescription,
  getPrescriptionById,
  getPrescriptionByConsultation
} = require('../controllers/prescriptionController');


router.post(
  '/',
  verifyToken,
  roleGuard(['staff', 'admin']),
  createPrescription
);

router.get(
  '/:prescriptionId',
  verifyToken,
  roleGuard(['staff', 'admin']),
  getPrescriptionById
);

router.get(
  '/consultation/:consultationId',
  verifyToken,
  roleGuard(['staff', 'admin']),
  getPrescriptionByConsultation
);


module.exports = router;