const Token = require('../models/Token');
const OPD = require('../models/OPD');
const CaregiverLink = require('../models/CaregiverLink');
const User = require('../models/User');
const { generateId } = require('../utils/id');
const { notifyTokenBooked } = require('../services/notificationService');

// 1. BOOK A TOKEN
exports.bookToken = async (req, res) => {
  try {
    const { opdId, doctorId, roomId, queueDate, patientId: targetPatientId } = req.body;
    
    // Logged-in User Info
    const userId = req.user.userId;
    const userRole = req.user.role;
    let patientId = targetPatientId || req.user.patientId || req.user.userId;

    // --- 🛑 CAREGIVER LINK VERIFICATION CHECK ---
    if (userRole === 'caregiver') {
      if (!targetPatientId) {
        return res.status(400).json({
          success: false,
          message: 'patientId is required when booking as a caregiver.'
        });
      }

      const caregiver = await User.findOne({ userId, role: 'caregiver' });
      if (!caregiver || !caregiver.caregiverId) {
        return res.status(404).json({
          success: false,
          message: 'Caregiver account or Caregiver ID not found.'
        });
      }

      // CaregiverLink model එකෙන් link එක active සහ verified ද කියා පරීක්ෂා කිරීම
      const activeLink = await CaregiverLink.findOne({
        caregiverId: caregiver.caregiverId,
        patientId: targetPatientId,
        status: 'active',
        verified: true
      });

      if (!activeLink) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to book a token for this patient. Link must be active and verified.'
        });
      }

      patientId = targetPatientId;
    }
    // -----------------------------------------------------

    const opd = await OPD.findOne({ opdId });
    if (!opd) {
      return res.status(404).json({ success: false, message: 'OPD not found' });
    }

    const todayStr = queueDate || new Date().toISOString().split('T')[0];

    // --- 🛑 SECURITY CHECK: DUPLICATE BOOKING PREVENTION ---
    const existingActiveToken = await Token.findOne({
      patientId,
      opdId,
      queueDate: todayStr,
      status: { $in: ['waiting', 'called', 'hold', 'in-consultation'] }
    });

    if (existingActiveToken) {
      return res.status(400).json({
        success: false,
        message: `An active token (${existingActiveToken.tokenNo}) already exists for this patient in this OPD today.`
      });
    }
    // -----------------------------------------------------

    // එදිනට අදාළ අන්තිම Token Sequence එක සොයාගැනීම
    const lastToken = await Token.findOne({ opdId, queueDate: todayStr })
      .sort({ tokenSequence: -1 });

    const nextSequence = lastToken ? lastToken.tokenSequence + 1 : 1;
    
    // Display Token No (e.g., A-1, A-2)
    const prefixLetter = opd.name ? opd.name.charAt(0).toUpperCase() : 'A';
    const tokenNo = `${prefixLetter}-${nextSequence}`;

    // IDs Generate කිරීම
    const tokenId = generateId('TKN');
    const trackingCode = generateId('TRK');

    const newToken = new Token({
      tokenId,
      tokenNo,
      tokenSequence: nextSequence,
      queueDate: todayStr,
      patientId,
      userId,
      opdId,
      doctorId: doctorId || (opd.doctorIds && opd.doctorIds[0]) || null,
      roomId: roomId || opd.roomId || null,
      trackingCode,
      status: 'waiting'
    });

    await newToken.save();

    // --- 🔔 BOOKING NOTIFICATION ---
    // In-app notification always; SMS only if the user enabled SMS in alert preferences.
    // Runs in the background so a notification problem never fails the booking.
    notifyTokenBooked({
      userId,
      tokenId: newToken.tokenId,
      tokenNo: newToken.tokenNo,
      opdName: opd.name
    }).catch((err) => console.error('Booking notification failed:', err.message));
    // ----------------------------------------------

    res.status(201).json({
      success: true,
      data: newToken,
      message: 'Token booked successfully'
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Slot was just taken. Please try booking again.' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET MY TOKENS
exports.getMyTokens = async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokens = await Token.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. GET TOKEN BY ID
exports.getTokenById = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const token = await Token.findOne({ tokenId });
    
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    res.status(200).json({ success: true, data: token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. CANCEL TOKEN
exports.cancelToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { cancelReason } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const token = await Token.findOne({ tokenId });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
    }

    if (token.userId !== userId && !['admin', 'staff'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this token.'
      });
    }

    token.status = 'cancelled';
    token.cancelledAt = new Date();
    token.cancelReason = cancelReason || 'Cancelled by user';

    await token.save();

    res.status(200).json({ success: true, data: token, message: 'Token cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. PUBLIC TRACKING
exports.trackTokenStatus = async (req, res) => {
  try {
    const { trackingCode } = req.params;

    const token = await Token.findOne({ trackingCode }).select(
      'tokenNo tokenSequence queueDate opdId status createdAt'
    );

    if (!token) {
      return res.status(404).json({ success: false, message: 'Invalid tracking code or Token not found' });
    }

    const currentCallingToken = await Token.findOne({
      opdId: token.opdId,
      queueDate: token.queueDate,
      status: { $in: ['called', 'in-consultation'] }
    }).sort({ tokenSequence: -1 });

    res.status(200).json({
      success: true,
      data: {
        tokenNo: token.tokenNo,
        status: token.status,
        yourSequence: token.tokenSequence,
        currentlyServing: currentCallingToken ? currentCallingToken.tokenNo : 'Waiting to start',
        queueDate: token.queueDate
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. GET OPD QUEUE
exports.getOpdQueue = async (req, res) => {
  try {
    const { opdId } = req.params;
    const queueDate = req.query.queueDate || new Date().toISOString().split('T')[0];

    const queue = await Token.find({ opdId, queueDate }).sort({ tokenSequence: 1 });

    res.status(200).json({
      success: true,
      totalCount: queue.length,
      data: queue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};