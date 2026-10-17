const Prescription = require('../models/Prescription');
const Consultation = require('../models/Consultation');
const { generateId } = require('../utils/id');

exports.createPrescription = async (req, res) => {
  try {
    const {
      consultationId,
      medicines,
      notes
    } = req.body;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        message: 'consultationId is required'
      });
    }

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one medicine is required'
      });
    }

    const consultation = await Consultation.findOne({ consultationId });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // A prescription is allowed only after the consultation lifecycle is complete.
    if (!consultation.startedAt || !consultation.endedAt) {
      return res.status(400).json({
        success: false,
        message: 'Prescription can only be added after the consultation is completed'
      });
    }

    const existingPrescription = await Prescription.findOne({ consultationId });

    if (existingPrescription) {
      return res.status(400).json({
        success: false,
        message: 'Prescription already exists for this consultation'
      });
    }

    const prescription = new Prescription({
      prescriptionId: generateId('PRE'),
      consultationId: consultation.consultationId,
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      opdId: consultation.opdId,
      medicines,
      notes
    });

    await prescription.save();

    return res.status(201).json({
      success: true,
      data: prescription,
      message: 'Prescription created successfully'
    });

  } catch (error) {
    console.error('Create prescription error:', error);

    if (error.code === 11000 && error.keyPattern?.consultationId) {
      return res.status(400).json({
        success: false,
        message: 'Prescription already exists for this consultation'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create prescription'
    });
  }
};

// Patients can only see prescriptions attached to their own patient account.
exports.getMyPrescriptions = async (req, res) => {
  try {
    const patientId = req.user.patientId || req.user.userId;
    const prescriptions = await Prescription.find({ patientId }).sort({ prescribedAt: -1 });
    return res.status(200).json({ success: true, data: prescriptions });
  } catch (error) {
    console.error('Get patient prescriptions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get prescriptions' });
  }
};

exports.getPrescriptionById = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findOne({ prescriptionId });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: prescription
    });

  } catch (error) {
    console.error('Get prescription error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get prescription'
    });
  }
};

exports.getPrescriptionByConsultation = async (req, res) => {
  try {
    const { consultationId } = req.params;

    const prescription = await Prescription.findOne({ consultationId });

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found for this consultation'
      });
    }

    return res.status(200).json({
      success: true,
      data: prescription
    });

  } catch (error) {
    console.error('Get prescription by consultation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get prescription'
    });
  }
};
