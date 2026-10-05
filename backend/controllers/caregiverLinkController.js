const CaregiverLink = require('../models/CaregiverLink');
const User = require('../models/User');

const {
  getPatientQueueStatus,
  getPatientNotifications
} = require('../services/caregiverIntegrationService');


// ======================================================
// CREATE - Link a patient
// ======================================================
exports.linkPatient = async (req, res) => {
  try {
    const {
      patientIdentifier,
      phone,
      relationship
    } = req.body;

    if (
      !patientIdentifier ||
      !phone ||
      !relationship
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Patient ID/NIC, phone number and relationship are required.'
      });
    }

    // Find logged-in caregiver
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
        message:
          'Caregiver ID is missing from this account.'
      });
    }

    // Find patient using Patient ID or NIC
    // together with phone number
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
        message:
          'No matching patient found using the provided details.'
      });
    }

    // Check whether link already exists
    const existingLink =
      await CaregiverLink.findOne({
        caregiverId: caregiver.caregiverId,
        patientId: patient.patientId
      });

    if (
      existingLink &&
      existingLink.status !== 'revoked'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'This patient is already linked to this caregiver.'
      });
    }

    // Restore a previously revoked link
    if (
      existingLink &&
      existingLink.status === 'revoked'
    ) {
      existingLink.relationship =
        relationship;

      existingLink.status = 'pending';
      existingLink.verified = false;
      existingLink.verifiedBy = null;
      existingLink.verifiedAt = null;
      existingLink.linkedAt = new Date();

      await existingLink.save();

      return res.status(200).json({
        success: true,

        data: {
          link: existingLink,

          patient: {
            patientId: patient.patientId,
            firstName: patient.firstName,
            lastName: patient.lastName
          }
        },

        message:
          'Patient link request created successfully.'
      });
    }

    // Create new link
    const link =
      await CaregiverLink.create({
        caregiverId:
          caregiver.caregiverId,

        patientId:
          patient.patientId,

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

      message:
        'Patient link request created successfully.'
    });

  } catch (error) {
    console.error(
      'Link Patient Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to link patient.'
    });
  }
};


// ======================================================
// READ - Get caregiver's linked patients
// ======================================================
exports.getLinkedPatients = async (
  req,
  res
) => {
  try {
    const caregiver =
      await User.findOne({
        userId: req.user.userId,
        role: 'caregiver'
      });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver account not found.'
      });
    }

    const links =
      await CaregiverLink.find({
        caregiverId:
          caregiver.caregiverId,

        status: {
          $ne: 'revoked'
        }
      }).sort({
        createdAt: -1
      });

    const result = [];

    for (const link of links) {
      const patient =
        await User.findOne({
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
      message:
        'Linked patients retrieved successfully.'
    });

  } catch (error) {
    console.error(
      'Get Linked Patients Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve linked patients.'
    });
  }
};


// ======================================================
// READ - Get linked patient's token + live queue status
// ======================================================
exports.getLinkedPatientStatus = async (
  req,
  res
) => {
  try {
    // Find logged-in caregiver
    const caregiver =
      await User.findOne({
        userId: req.user.userId,
        role: 'caregiver'
      });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver account not found.'
      });
    }

    // Only allow access to caregiver's
    // own verified + active patient link
    const link =
      await CaregiverLink.findOne({
        linkId: req.params.id,

        caregiverId:
          caregiver.caregiverId,

        verified: true,
        status: 'active'
      });

    if (!link) {
      return res.status(404).json({
        success: false,
        message:
          'Active verified caregiver link not found.'
      });
    }

    // Find linked patient
    const patient =
      await User.findOne({
        patientId: link.patientId,
        role: 'patient'
      }).select(
        'patientId firstName lastName status'
      );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message:
          'Linked patient not found.'
      });
    }

    // Use our own integration service
    // to READ shared Token + OPD data
    const {
      token,
      liveQueue
    } = await getPatientQueueStatus(
      link.patientId
    );

    return res.status(200).json({
      success: true,

      data: {
        link: {
          linkId: link.linkId,
          relationship:
            link.relationship,

          verified:
            link.verified,

          status:
            link.status
        },

        patient: {
          patientId:
            patient.patientId,

          firstName:
            patient.firstName,

          lastName:
            patient.lastName,

          status:
            patient.status
        },

        token,

        liveQueue,

        // Will be connected when
        // Consultation module becomes available
        consultation: null
      },

      message: token
        ? 'Linked patient status retrieved successfully.'
        : 'Linked patient has no active token.'
    });

  } catch (error) {
    console.error(
      'Get Linked Patient Status Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve linked patient status.'
    });
  }
};


// ======================================================
// READ - Get linked patient's notifications
// ======================================================
exports.getLinkedPatientNotifications =
  async (req, res) => {
    try {
      // Find logged-in caregiver
      const caregiver =
        await User.findOne({
          userId:
            req.user.userId,

          role:
            'caregiver'
        });

      if (!caregiver) {
        return res.status(404).json({
          success: false,
          message:
            'Caregiver account not found.'
        });
      }

      // Caregiver may only read alerts
      // of their verified linked patient
      const link =
        await CaregiverLink.findOne({
          linkId:
            req.params.id,

          caregiverId:
            caregiver.caregiverId,

          verified:
            true,

          status:
            'active'
        });

      if (!link) {
        return res.status(404).json({
          success: false,
          message:
            'Active verified caregiver link not found.'
        });
      }

      // Read shared Notification data
      // through our integration service
      const result =
        await getPatientNotifications(
          link.patientId
        );

      if (!result.patient) {
        return res.status(404).json({
          success: false,
          message:
            'Linked patient not found.'
        });
      }

      return res.status(200).json({
        success: true,

        data: {
          linkId:
            link.linkId,

          relationship:
            link.relationship,

          patient:
            result.patient,

          notifications:
            result.notifications
        },

        message:
          'Linked patient notifications retrieved successfully.'
      });

    } catch (error) {
      console.error(
        'Get Linked Patient Notifications Error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to retrieve linked patient notifications.'
      });
    }
  };


// ======================================================
// UPDATE - Change caregiver relationship
// ======================================================
exports.updateRelationship = async (
  req,
  res
) => {
  try {
    const {
      relationship
    } = req.body;

    if (!relationship) {
      return res.status(400).json({
        success: false,
        message:
          'Relationship is required.'
      });
    }

    const caregiver =
      await User.findOne({
        userId:
          req.user.userId,

        role:
          'caregiver'
      });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver account not found.'
      });
    }

    const link =
      await CaregiverLink.findOne({
        linkId:
          req.params.id,

        caregiverId:
          caregiver.caregiverId,

        status: {
          $ne: 'revoked'
        }
      });

    if (!link) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver link not found.'
      });
    }

    link.relationship =
      relationship;

    await link.save();

    return res.status(200).json({
      success: true,
      data: link,
      message:
        'Relationship updated successfully.'
    });

  } catch (error) {
    console.error(
      'Update Relationship Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to update relationship.'
    });
  }
};


// ======================================================
// DELETE - Unlink patient
// ======================================================
exports.unlinkPatient = async (
  req,
  res
) => {
  try {
    const caregiver =
      await User.findOne({
        userId:
          req.user.userId,

        role:
          'caregiver'
      });

    if (!caregiver) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver account not found.'
      });
    }

    const link =
      await CaregiverLink.findOne({
        linkId:
          req.params.id,

        caregiverId:
          caregiver.caregiverId,

        status: {
          $ne: 'revoked'
        }
      });

    if (!link) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver link not found.'
      });
    }

    // Soft delete
    link.status =
      'revoked';

    link.verified =
      false;

    await link.save();

    return res.status(200).json({
      success: true,
      data: link,
      message:
        'Patient unlinked successfully.'
    });

  } catch (error) {
    console.error(
      'Unlink Patient Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to unlink patient.'
    });
  }
};


// ======================================================
// ADMIN - Verify or reject caregiver-patient link
// ======================================================
exports.verifyLink = async (
  req,
  res
) => {
  try {
    const {
      action
    } = req.body;

    if (
      !action ||
      ![
        'verify',
        'reject'
      ].includes(action)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Action must be either verify or reject.'
      });
    }

    const link =
      await CaregiverLink.findOne({
        linkId:
          req.params.id
      });

    if (!link) {
      return res.status(404).json({
        success: false,
        message:
          'Caregiver link not found.'
      });
    }

    if (action === 'verify') {
      link.verified =
        true;

      link.status =
        'active';

      link.verifiedBy =
        req.user.userId;

      link.verifiedAt =
        new Date();
    }

    if (action === 'reject') {
      link.verified =
        false;

      link.status =
        'revoked';

      link.verifiedBy =
        req.user.userId;

      link.verifiedAt =
        new Date();
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
    console.error(
      'Verify Caregiver Link Error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to process caregiver link verification.'
    });
  }
};