const Token = require('../models/Token');
const OPD = require('../models/OPD');
const User = require('../models/User');
const Notification = require('../models/Notification');


// ======================================================
// GET LINKED PATIENT TOKEN + LIVE QUEUE INFORMATION
// ======================================================
const getPatientQueueStatus = async (patientId) => {
  const activeStatuses = [
    'waiting',
    'called',
    'hold',
    'in-consultation'
  ];

  // Find the linked patient's latest active token
  const token = await Token.findOne({
    patientId,
    status: { $in: activeStatuses }
  }).sort({ createdAt: -1 });

  if (!token) {
    return {
      token: null,
      liveQueue: null
    };
  }

  // Find OPD information
  const opd = await OPD.findOne({
    opdId: token.opdId
  });

  // Count active patients before this patient's token
  const patientsAhead = await Token.countDocuments({
    opdId: token.opdId,
    queueDate: token.queueDate,
    tokenSequence: { $lt: token.tokenSequence },
    status: { $in: activeStatuses }
  });

  // Find the token currently being called
  const currentCalledToken = await Token.findOne({
    opdId: token.opdId,
    queueDate: token.queueDate,
    status: 'called'
  })
    .sort({ calledAt: -1 })
    .select('tokenId tokenNo');

  // Count how many patients are currently waiting
  const totalWaiting = await Token.countDocuments({
    opdId: token.opdId,
    queueDate: token.queueDate,
    status: 'waiting'
  });

  // Use OPD average consultation time
  const estimatedWaitMinutes =
    patientsAhead * (opd?.avgConsultMinutes || 10);

  return {
    token: {
      tokenId: token.tokenId,
      tokenNo: token.tokenNo,
      tokenSequence: token.tokenSequence,
      queueDate: token.queueDate,
      opdId: token.opdId,
      doctorId: token.doctorId,
      roomId: token.roomId,
      status: token.status,
      bookedAt: token.bookedAt
    },

    liveQueue: {
      opdId: token.opdId,
      opdName: opd?.name || null,

      currentToken: currentCalledToken
        ? currentCalledToken.tokenNo
        : null,

      patientsAhead,
      estimatedWaitMinutes,
      totalWaiting
    }
  };
};


// ======================================================
// GET NOTIFICATIONS OF A LINKED PATIENT
// ======================================================
const getPatientNotifications = async (patientId) => {
  // Convert public patientId -> account userId
  const patient = await User.findOne({
    patientId,
    role: 'patient'
  }).select(
    'userId patientId firstName lastName'
  );

  if (!patient) {
    return {
      patient: null,
      notifications: []
    };
  }

  // Read notifications created by the shared
  // notification module for this patient's account
  const notifications = await Notification.find({
    userId: patient.userId
  })
    .sort({ sentAt: -1 })
    .select(
      'notificationId tokenId type message channel isRead sentAt createdAt'
    );

  return {
    patient: {
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName
    },

    notifications
  };
};


module.exports = {
  getPatientQueueStatus,
  getPatientNotifications
};