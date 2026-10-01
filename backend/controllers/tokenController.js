const Token = require('../models/Token');
const OPD = require('../models/OPD');
const { generateId } = require('../utils/id');

// 1. BOOK A TOKEN
exports.bookToken = async (req, res) => {
  try {
    const { opdId, doctorId, roomId, queueDate } = req.body;
    
    // User / Patient validation
    const userId = req.user.userId;
    const patientId = req.user.patientId || req.user.userId;

    const opd = await OPD.findOne({ opdId });
    if (!opd) {
      return res.status(404).json({ success: false, message: 'OPD not found' });
    }

    const todayStr = queueDate || new Date().toISOString().split('T')[0];

    // --- 🛑 SECURITY CHECK: DUPLICATE BOOKING PREVENTION ---

    const existingActiveToken = await Token.findOne({
      userId,
      opdId,
      queueDate: todayStr,
      status: { $in: ['waiting', 'called', 'hold', 'in-consultation'] }
    });

    if (existingActiveToken) {
      return res.status(400).json({
        success: false,
        message: `You already have an active token (${existingActiveToken.tokenNo}) for this OPD today.`
      });
    }
    // -----------------------------------------------------

    // එදිනට අදාළ අන්තිම Token Sequence එක සොයාගැනීම
    const lastToken = await Token.findOne({ opdId, queueDate: todayStr })
      .sort({ tokenSequence: -1 });

    const nextSequence = lastToken ? lastToken.tokenSequence + 1 : 1;
    
    // Display Token No (e.g., A-1, A-2)
    const prefixLetter = opd.name.charAt(0).toUpperCase() || 'A';
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

    const token = await Token.findOne({ tokenId });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Token not found' });
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