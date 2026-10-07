const express = require('express');
const router = express.Router();

const {
  verifyToken,
  roleGuard
} = require('../middleware/auth');

const {
  startConsultation,
  completeConsultation,
  getConsultationById,
  getConsultationByToken
} = require('../controllers/consultationController');


router.post(
  '/start',
  verifyToken,
  roleGuard(['staff', 'admin']),
  startConsultation
);

router.put(
  '/:consultationId/complete',
  verifyToken,
  roleGuard(['staff', 'admin']),
  completeConsultation
);

router.get(
  '/:consultationId',
  verifyToken,
  roleGuard(['staff', 'admin']),
  getConsultationById
);

router.get(
  '/token/:tokenId',
  verifyToken,
  roleGuard(['staff', 'admin']),
  getConsultationByToken
);


module.exports = router;