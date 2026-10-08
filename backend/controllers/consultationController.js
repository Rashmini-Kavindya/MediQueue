const Consultation = require('../models/Consultation');
const Token = require('../models/Token');
const { generateId } = require('../utils/id');

exports.startConsultation = async (req, res) => {
  try {
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'tokenId is required'
      });
    }

    const token = await Token.findOne({ tokenId });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    if (token.status !== 'called') {
      return res.status(400).json({
        success: false,
        message: `Cannot start consultation. Token status is ${token.status}`
      });
    }

    const existingConsultation = await Consultation.findOne({ tokenId });

    if (existingConsultation) {
      return res.status(400).json({
        success: false,
        message: 'Consultation already exists for this token'
      });
    }

    const startedAt = new Date();

    const consultation = new Consultation({
      consultationId: generateId('CON'),
      tokenId: token.tokenId,
      patientId: token.patientId,
      doctorId: token.doctorId,
      opdId: token.opdId,
      roomId: token.roomId,
      startedAt
    });

    await consultation.save();

    token.status = 'in-consultation';
    token.consultationStartedAt = startedAt;

    await token.save();

    return res.status(201).json({
      success: true,
      data: consultation,
      message: 'Consultation started successfully'
    });

  } catch (error) {
    console.error('Start consultation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to start consultation'
    });
  }
};


exports.completeConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({ consultationId });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    if (consultation.endedAt) {
      return res.status(400).json({
        success: false,
        message: 'Consultation is already completed'
      });
    }

    const token = await Token.findOne({ tokenId: consultation.tokenId });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Related token not found'
      });
    }

    if (token.status !== 'in-consultation') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete consultation. Token status is ${token.status}`
      });
    }

    const endedAt = new Date();

    consultation.endedAt = endedAt;

    await consultation.save();

    token.status = 'completed';
    token.completedAt = endedAt;

    await token.save();

    return res.status(200).json({
      success: true,
      data: consultation,
      message: 'Consultation completed successfully'
    });

  } catch (error) {
    console.error('Complete consultation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to complete consultation'
    });
  }
};


exports.getConsultationById = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({ consultationId });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: consultation
    });

  } catch (error) {
    console.error('Get consultation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get consultation'
    });
  }
};


exports.getConsultationByToken = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const consultation = await Consultation.findOne({ tokenId });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found for this token'
      });
    }

    return res.status(200).json({
      success: true,
      data: consultation
    });

  } catch (error) {
    console.error('Get consultation by token error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get consultation'
    });
  }
};