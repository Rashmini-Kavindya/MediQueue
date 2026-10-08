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

    // Prescription can only be created during an active consultation.
    if (!consultation.startedAt || consultation.endedAt) {
      return res.status(400).json({
        success: false,
        message: 'Prescription can only be added during an active consultation'
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

    return res.status(500).json({
      success: false,
      message: 'Failed to create prescription'
    });
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
//in-consultation → prescription allowed
//completed → prescription rejected 