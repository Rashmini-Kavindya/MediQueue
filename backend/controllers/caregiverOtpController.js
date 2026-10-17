

const mongoose = require('mongoose');



const User = require('../models/User');

const CaregiverLink = require('../models/CaregiverLink');

const Verification = require('../models/CaregiverLinkVerification');



const {

  OTP_EXPIRY_MS,

  RESEND_COOLDOWN_MS,

  MAX_ATTEMPTS,

  normalizePhone,

  phonesMatch,

  generateOtp,

  hashOtp,

  compareOtp,

  sendPatientOtp,

  createPatientOtpAlert,

  createLinkSuccessAlert,
  createCaregiverLinkSuccessAlert,
  maskPhone

} = require('../services/caregiverOtpService');



const getCaregiver = (userId) => {

  return User.findOne({

    userId,

    role: 'caregiver',

    status: 'active'

  });

};



const caregiverName = (user) =>

  `${user.firstName || ''} ${user.lastName || ''}`.trim();





// ======================================================

// 1. START VERIFICATION

// POST /api/links/verification/start

// ======================================================



exports.startVerification = async (req, res) => {

  try {

    const {

      patientId,

      patientIdentifier,

      phone,

      relationship

    } = req.body;



    const identifier = String(

      patientId || patientIdentifier || ''

    ).trim().toUpperCase();



    if (!identifier) {

      return res.status(400).json({

        success: false,

        message: 'Please select a patient first.'

      });

    }



    if (!phone || !String(phone).trim()) {

      return res.status(400).json({

        success: false,

        message: 'Patient registered phone number is required.'

      });

    }



    if (!normalizePhone(phone)) {

      return res.status(400).json({

        success: false,

        message: 'Enter a valid Sri Lankan mobile number.'

      });

    }



    const caregiver = await getCaregiver(req.user.userId);



    if (!caregiver || !caregiver.caregiverId) {

      return res.status(403).json({

        success: false,

        message: 'Active caregiver account not found.'

      });

    }



    const patient = await User.findOne({

      role: 'patient',

      status: 'active',

      $or: [

        { patientId: identifier },

        { nic: identifier }

      ]

    });



    // Avoid revealing additional patient details on failure.

    if (!patient || !phonesMatch(phone, patient.phone)) {

      return res.status(400).json({

        success: false,

        message: 'Patient details do not match the registered record.'

      });

    }



    const existingLink = await CaregiverLink.findOne({

      caregiverId: caregiver.caregiverId,

      patientId: patient.patientId

    });



    if (

      existingLink?.status === 'active' &&

      existingLink?.verified === true

    ) {

      return res.status(409).json({

        success: false,

        message: 'This patient is already linked to your account.'

      });

    }



    const now = new Date();



    const previous = await Verification.findOne({

      caregiverId: caregiver.caregiverId,

      patientId: patient.patientId,

      status: 'pending',

      expiresAt: { $gt: now }

    }).sort({ createdAt: -1 });



    if (previous && now < previous.resendAvailableAt) {

      const wait = Math.ceil(

        (previous.resendAvailableAt - now) / 1000

      );



      return res.status(429).json({

        success: false,

        retryAfterSeconds: wait,

        message: `Please wait ${wait} seconds before requesting another code.`

      });

    }



    // Limit requests to reduce SMS spam and cost.

    const hourAgo = new Date(

      Date.now() - 60 * 60 * 1000

    );



    const caregiverRequests = await Verification.countDocuments({

      caregiverId: caregiver.caregiverId,

      createdAt: { $gte: hourAgo }

    });



    const patientRequests = await Verification.countDocuments({

      patientId: patient.patientId,

      createdAt: { $gte: hourAgo }

    });



    if (caregiverRequests >= 5 || patientRequests >= 5) {

      return res.status(429).json({

        success: false,

        message: 'Too many verification requests. Please try again later.'

      });

    }



    const otp = generateOtp();



    const verification = new Verification({

      caregiverId: caregiver.caregiverId,

      patientId: patient.patientId,

      patientUserId: patient.userId,

      relationship: String(relationship || 'Caregiver').trim(),

      phone: normalizePhone(patient.phone),

      otpHash: await hashOtp(otp),

      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),

      resendAvailableAt: new Date(

        Date.now() + RESEND_COOLDOWN_MS

      ),

      status: 'sending'

    });



    await verification.save();



    // The SMS must be accepted before the request becomes usable.

    try {

      await sendPatientOtp(patient.phone, otp);

    } catch (smsError) {

      verification.status = 'failed';

      await verification.save();



      console.error(

        'Caregiver consent SMS error:',

        smsError.message

      );



      return res.status(502).json({

        success: false,

        message:

          'Unable to send the verification SMS. ' +

          'Please check the SMS configuration and try again.'

      });

    }



    // Invalidate earlier pending codes for this pair.

    await Verification.updateMany(

      {

        caregiverId: caregiver.caregiverId,

        patientId: patient.patientId,

        verificationId: { $ne: verification.verificationId },

        status: 'pending'

      },

      { $set: { status: 'expired' } }

    );



    verification.status = 'pending';

    await verification.save();



    let appAlertCreated = false;



    try {

      await createPatientOtpAlert({

        patientUserId: patient.userId,

        verificationId: verification.verificationId,

        caregiverName: caregiverName(caregiver),

        otp

      });



      appAlertCreated = true;

    } catch (alertError) {

      console.error(

        'Caregiver OTP app alert failed:',

        alertError.message

      );

    }



    return res.status(201).json({

      success: true,

      data: {

        verificationId: verification.verificationId,

        patientId: patient.patientId,

        maskedPhone: maskPhone(patient.phone),

        expiresInSeconds: 600,

        resendAfterSeconds: 60,

        appAlertCreated

      },

      message:

        appAlertCreated

          ? 'SMS verification requested and patient app alert created.'

          : 'SMS verification requested, but the app alert could not be created.'

    });



  } catch (error) {

    console.error(

      'Start caregiver verification error:',

      error.message

    );



    return res.status(500).json({

      success: false,

      message: 'Unable to start caregiver verification.'

    });

  }

};





// ======================================================

// 2. VERIFY OTP AND ACTIVATE CAREGIVER LINK

// POST /api/links/verification/verify

// ======================================================



exports.verifyCode = async (req, res) => {

  try {

    const { verificationId, otp } = req.body;



    if (!verificationId || !/^\d{6}$/.test(String(otp || ''))) {

      return res.status(400).json({

        success: false,

        message: 'A valid six-digit verification code is required.'

      });

    }



    const caregiver = await getCaregiver(req.user.userId);



    if (!caregiver || !caregiver.caregiverId) {

      return res.status(403).json({

        success: false,

        message: 'Active caregiver account not found.'

      });

    }



    const request = await Verification.findOne({

      verificationId,

      caregiverId: caregiver.caregiverId

    });



    if (!request) {

      return res.status(404).json({

        success: false,

        message: 'Verification request not found.'

      });

    }



    if (request.status === 'locked') {

      return res.status(429).json({

        success: false,

        message: 'Too many incorrect attempts. Request a new code.'

      });

    }



    if (request.status !== 'pending') {

      return res.status(400).json({

        success: false,

        message: 'Verification request is no longer active.'

      });

    }



    if (new Date() >= request.expiresAt) {

      await Verification.updateOne(

        { _id: request._id, status: 'pending' },

        { $set: { status: 'expired' } }

      );



      return res.status(410).json({

        success: false,

        message: 'The verification code has expired.'

      });

    }



    if (request.attempts >= MAX_ATTEMPTS) {

      await Verification.updateOne(

        { _id: request._id, status: 'pending' },

        { $set: { status: 'locked' } }

      );



      return res.status(429).json({

        success: false,

        message: 'Too many incorrect attempts.'

      });

    }



    const isValid = await compareOtp(

      String(otp),

      request.otpHash

    );



    if (!isValid) {

      const updated = await Verification.findOneAndUpdate(

        {

          _id: request._id,

          status: 'pending',

          attempts: { $lt: MAX_ATTEMPTS }

        },

        { $inc: { attempts: 1 } },

        { new: true }

      );



      if (!updated) {

        return res.status(409).json({

          success: false,

          message: 'Verification state has changed. Please try again.'

        });

      }



      const remaining = Math.max(

        0,

        MAX_ATTEMPTS - updated.attempts

      );



      if (remaining === 0) {

        await Verification.updateOne(

          { _id: updated._id, status: 'pending' },

          { $set: { status: 'locked' } }

        );

      }



      return res.status(400).json({

        success: false,

        attemptsRemaining: remaining,

        message:

          remaining > 0

            ? `Incorrect code. ${remaining} attempts remaining.`

            : 'Too many incorrect attempts. Request a new code.'

      });

    }



    // Use a MongoDB transaction so the link and OTP verification

    // complete together, rather than leaving a partially active link.

    const session = await mongoose.startSession();

    let linkedRecord;



    try {

      await session.withTransaction(async () => {

        const claimed = await Verification.findOneAndUpdate(

          {

            _id: request._id,

            caregiverId: caregiver.caregiverId,

            status: 'pending',

            attempts: { $lt: MAX_ATTEMPTS },

            expiresAt: { $gt: new Date() }

          },

          {

            $set: {

              status: 'verified',

              verifiedAt: new Date()

            }

          },

          { session, new: true }

        );



        if (!claimed) {

          const error = new Error(

            'This code has expired or has already been used.'

          );

          error.statusCode = 409;

          throw error;

        }



        const patient = await User.findOne({

          userId: claimed.patientUserId,

          patientId: claimed.patientId,

          role: 'patient',

          status: 'active'

        }).session(session);



        if (

          !patient ||

          !phonesMatch(patient.phone, claimed.phone)

        ) {

          const error = new Error(

            'Patient record or registered phone has changed.'

          );

          error.statusCode = 409;

          throw error;

        }



        let link = await CaregiverLink.findOne({

          caregiverId: claimed.caregiverId,

          patientId: claimed.patientId

        }).session(session);



        if (!link) {

          link = new CaregiverLink({

            caregiverId: claimed.caregiverId,

            patientId: claimed.patientId,

            relationship: claimed.relationship

          });

        }



        link.relationship = claimed.relationship;

        link.status = 'active';

        link.verified = true;

        link.verificationMethod = 'Patient SMS OTP consent';

        link.verifiedBy = claimed.patientUserId;

        link.verifiedAt = new Date();

        link.linkedAt = new Date();



        await link.save({ session });



        linkedRecord = {

          linkId: link.linkId,

          patientId: link.patientId,

          relationship: link.relationship,

          verified: link.verified,

          status: link.status

        };

      });

    } finally {

      await session.endSession();

    }



    // A notification failure must not undo a completed link.

    try {

      await createLinkSuccessAlert({

        patientUserId: request.patientUserId,

        linkId: linkedRecord.linkId,

        caregiverName: caregiverName(caregiver)

      });

    } catch (alertError) {

      console.error(

        'Link success alert failed:',

        alertError.message

      );

    }



        // Caregiver receives a separate success notification, addressed to
    // the caregiver's own userId; no patient OTP is copied here.
    try {
      const patient = await User.findOne({
        userId: request.patientUserId,
        patientId: request.patientId
      }).select('firstName lastName');

      const patientName = patient
        ? `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
        : 'The patient';

      await createCaregiverLinkSuccessAlert({
        caregiverUserId: caregiver.userId,
        linkId: linkedRecord.linkId,
        patientName
      });
    } catch (alertError) {
      console.error('Caregiver success alert failed:', alertError.message);
    }

return res.status(200).json({

      success: true,

      data: linkedRecord,

      message: 'Patient linked successfully.'

    });



  } catch (error) {

    console.error(

      'Verify caregiver OTP error:',

      error.message

    );



    return res.status(error.statusCode || 500).json({

      success: false,

      message:

        error.statusCode

          ? error.message

          : 'Unable to complete caregiver verification.'

    });

  }

};
