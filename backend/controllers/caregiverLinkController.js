const CaregiverLink = require('../models/CaregiverLink');
const User = require('../models/User');

// ======================================================
// CREATE - Link a patient
// ======================================================
exports.linkPatient = async (req, res) => {
  try {
    const { patientIdentifier, phone, relationship } = req.body;

    if (!patientIdentifier || !phone || !relationship) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID/NIC, phone number and relationship are required.'
      });
    }

    // Find logged-in caregiver using userId from JWT
    const caregiver = await User.findOne({
      userId: req.user.userId,
      role: 'caregiver'
    });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver account not found.'
      });
    }

    if (!caregiver.caregiverId) {
      return res.status(400).json({
        success: false,
        message: 'Caregiver ID is missing from this account.'
      });
    }

    // Find patient by either patientId or NIC + matching phone
    const patient = await User.findOne({
      role: 'patient',
      phone,
      $or: [
        { patientId: patientIdentifier },
        { nic: patientIdentifier }
      ]
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'No matching patient found using the provided details.'
      });
    }

    // Check whether this relationship already exists
    const existingLink = await CaregiverLink.findOne({
      caregiverId: caregiver.caregiverId,
      patientId: patient.patientId
    });

    if (existingLink && existingLink.status !== 'revoked') {
      return res.status(409).json({
        success: false,
        message: 'This patient is already linked to this caregiver.'
      });
    }

    // If an old revoked relationship exists, restore it
    if (existingLink && existingLink.status === 'revoked') {
      existingLink.relationship = relationship;
      existingLink.status = 'pending';
      existingLink.verified = false;
      existingLink.verifiedBy = null;
      existingLink.verifiedAt = null;
      existingLink.linkedAt = new Date();

      await existingLink.save();

      return res.status(200).json({
        success: true,
        data: existingLink,
        message: 'Patient link request created successfully.'
      });
    }

    const link = await CaregiverLink.create({
      caregiverId: caregiver.caregiverId,
      patientId: patient.patientId,
      relationship
    });

    return res.status(201).json({
      success: true,
      data: {
        link,
        patient: {
          patientId: patient.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName
        }
      },
      message: 'Patient link request created successfully.'
    });

  } catch (error) {
    console.error('Link Patient Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to link patient.'
    });
  }
};


// ======================================================
// READ - Get caregiver's linked patients
// ======================================================
exports.getLinkedPatients = async (req, res) => {
  try {
    const caregiver = await User.findOne({
      userId: req.user.userId,
      role: 'caregiver'
    });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver account not found.'
      });
    }

    const links = await CaregiverLink.find({
      caregiverId: caregiver.caregiverId,
      status: { $ne: 'revoked' }
    }).sort({ createdAt: -1 });

    const result = [];

    for (const link of links) {
      const patient = await User.findOne({
        patientId: link.patientId
      }).select(
        'patientId firstName lastName status'
      );

      result.push({
        ...link.toObject(),
        patient
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Linked patients retrieved successfully.'
    });

  } catch (error) {
    console.error('Get Linked Patients Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve linked patients.'
    });
  }
};


// ======================================================
// UPDATE - Change caregiver relationship
// ======================================================
exports.updateRelationship = async (req, res) => {
  try {
    const { relationship } = req.body;

    if (!relationship) {
      return res.status(400).json({
        success: false,
        message: 'Relationship is required.'
      });
    }

    const caregiver = await User.findOne({
      userId: req.user.userId,
      role: 'caregiver'
    });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver account not found.'
      });
    }

    const link = await CaregiverLink.findOne({
      linkId: req.params.id,
      caregiverId: caregiver.caregiverId,
      status: { $ne: 'revoked' }
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver link not found.'
      });
    }

    link.relationship = relationship;

    await link.save();

    return res.status(200).json({
      success: true,
      data: link,
      message: 'Relationship updated successfully.'
    });

  } catch (error) {
    console.error('Update Relationship Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update relationship.'
    });
  }
};


// ======================================================
// DELETE - Unlink patient
// ======================================================
exports.unlinkPatient = async (req, res) => {
  try {
    const caregiver = await User.findOne({
      userId: req.user.userId,
      role: 'caregiver'
    });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver account not found.'
      });
    }

    const link = await CaregiverLink.findOne({
      linkId: req.params.id,
      caregiverId: caregiver.caregiverId,
      status: { $ne: 'revoked' }
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver link not found.'
      });
    }

    // Soft delete so history is preserved
    link.status = 'revoked';
    link.verified = false;

    await link.save();

    return res.status(200).json({
      success: true,
      data: link,
      message: 'Patient unlinked successfully.'
    });

  } catch (error) {
    console.error('Unlink Patient Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to unlink patient.'
    });
  }
};

// ======================================================
// ADMIN - Verify or reject caregiver-patient link
// ======================================================
exports.verifyLink = async (req, res) => {
  try {
    const { action } = req.body;

    if (!action || !['verify', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either verify or reject.'
      });
    }

    const link = await CaregiverLink.findOne({
      linkId: req.params.id
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Caregiver link not found.'
      });
    }

    if (action === 'verify') {
      link.verified = true;
      link.status = 'active';
      link.verifiedBy = req.user.userId;
      link.verifiedAt = new Date();
    }

    if (action === 'reject') {
      link.verified = false;
      link.status = 'revoked';
      link.verifiedBy = req.user.userId;
      link.verifiedAt = new Date();
    }

    await link.save();

    return res.status(200).json({
      success: true,
      data: link,
      message:
        action === 'verify'
          ? 'Caregiver link verified successfully.'
          : 'Caregiver link rejected successfully.'
    });

  } catch (error) {
    console.error('Verify Caregiver Link Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to process caregiver link verification.'
    });
  }
};