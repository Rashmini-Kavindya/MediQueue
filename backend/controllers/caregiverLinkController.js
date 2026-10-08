const CaregiverLink = require('../models/CaregiverLink');

const User = require('../models/User');



const {

  getPatientQueueStatus

} = require('../services/caregiverIntegrationService');
const { getCaregiverSafeQueueNotifications } = require('../services/caregiverQueueAlertsService');






// ======================================================

// NORMALIZATION HELPERS

// ======================================================



const normalizeText = (value = '') => {

  return String(value)

    .trim()

    .toLowerCase()

    .replace(/[^\p{L}\p{N}\s]/gu, '')

    .replace(/\s+/g, ' ');

};





const normalizeIdentifier = (value = '') => {

  return String(value)

    .trim()

    .toUpperCase()

    .replace(/[\s-]/g, '');

};





const normalizePhone = (value = '') => {

  let phone = String(value)

    .replace(/\D/g, '');



  // Example:

  // +94 77 123 4567 -> 94771234567

  // convert to 0771234567

  if (

    phone.startsWith('94') &&

    phone.length === 11

  ) {

    phone = `0${phone.slice(2)}`;

  }



  return phone;

};





const phonesMatch = (first, second) => {

  const a = normalizePhone(first);

  const b = normalizePhone(second);



  if (!a || !b) {

    return false;

  }



  if (a === b) {

    return true;

  }



  // Compare Sri Lankan number without country/local prefix

  const aLast9 = a.slice(-9);

  const bLast9 = b.slice(-9);



  return aLast9 === bLast9;

};





const namesMatch = (patient, requestedName) => {

  if (!requestedName) {

    return true;

  }



  const requested =

    normalizeText(requestedName);



  const fullName =

    normalizeText(

      `${patient.firstName || ''} ${patient.lastName || ''}`

    );



  const reverseName =

    normalizeText(

      `${patient.lastName || ''} ${patient.firstName || ''}`

    );



  if (

    fullName === requested ||

    reverseName === requested

  ) {

    return true;

  }



  if (

    fullName.includes(requested) ||

    reverseName.includes(requested)

  ) {

    return true;

  }



  const requestedParts =

    requested

      .split(' ')

      .filter(Boolean);



  const fullNameParts =

    fullName

      .split(' ')

      .filter(Boolean);



  return requestedParts.every(

    part =>

      fullNameParts.includes(part)

  );

};





// ======================================================

// FIND REAL PATIENT

// ======================================================



const findMatchingPatients = async ({

  name,

  patientIdentifier,

  phone

}) => {

  const activePatients =

    await User.find({

      role: 'patient',

      status: 'active'

    }).select(

      'patientId firstName lastName nic phone email status'

    );





  const requestedIdentifier =

    normalizeIdentifier(

      patientIdentifier

    );





  return activePatients.filter(

    patient => {



      // ---------------- NAME ----------------

      if (

        name &&

        !namesMatch(

          patient,

          name

        )

      ) {

        return false;

      }





      // ---------------- ID / NIC ----------------

      if (requestedIdentifier) {

        const patientId =

          normalizeIdentifier(

            patient.patientId

          );



        const nic =

          normalizeIdentifier(

            patient.nic

          );



        if (

          patientId !==

            requestedIdentifier &&

          nic !==

            requestedIdentifier

        ) {

          return false;

        }

      }





      // ---------------- PHONE ----------------

      if (

        phone &&

        !phonesMatch(

          patient.phone,

          phone

        )

      ) {

        return false;

      }





      return true;

    }

  );

};





// ======================================================

// PATIENT NAME SUGGESTIONS

//

// GET /api/links/patient-suggestions?name=Minuri

//

// This endpoint DOES NOT choose a patient.

// It only returns possible matches.

// ======================================================



exports.getPatientSuggestions = async (

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





    const name =

      String(

        req.query.name || ''

      ).trim();





    // Avoid loading suggestions for only 1 character

    if (

      name.length < 2

    ) {

      return res.status(200).json({

        success: true,

        data: []

      });

    }





    const requested =

      normalizeText(name);





    const patients =

      await User.find({

        role:

          'patient',



        status:

          'active'

      }).select(

        'patientId firstName lastName nic status'

      );





    const matches =

      patients

        .filter(

          patient => {

            const firstName =

              normalizeText(

                patient.firstName || ''

              );



            const lastName =

              normalizeText(

                patient.lastName || ''

              );



            const fullName =

              normalizeText(

                `${patient.firstName || ''} ${patient.lastName || ''}`

              );



            const reverseName =

              normalizeText(

                `${patient.lastName || ''} ${patient.firstName || ''}`

              );





            return (

              firstName.includes(

                requested

              ) ||



              lastName.includes(

                requested

              ) ||



              fullName.includes(

                requested

              ) ||



              reverseName.includes(

                requested

              )

            );

          }

        )



        // Limit the dropdown

        .slice(0, 8)



        .map(

          patient => ({

            patientId:

              patient.patientId,



            firstName:

              patient.firstName,



            lastName:

              patient.lastName,



            nic:

              patient.nic || '',



            status:

              patient.status

          })

        );





    return res.status(200).json({

      success: true,



      data:

        matches,



      message:

        'Patient suggestions retrieved successfully.'

    });



  } catch (error) {

    console.error(

      'Patient Suggestions Error:',

      error

    );





    return res.status(500).json({

      success: false,



      message:

        'Unable to retrieve patient suggestions.'

    });

  }

};





// ======================================================

// SEARCH PATIENT

// GET /api/links/search-patient

// ======================================================



exports.searchPatient = async (

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





    const name =

      String(

        req.query.name || ''

      ).trim();



    const patientIdentifier =

      String(

        req.query.patientIdentifier ||

        ''

      ).trim();



    const phone =

      String(

        req.query.phone || ''

      ).trim();





    if (

      !name &&

      !patientIdentifier

    ) {

      return res.status(400).json({

        success: false,

        message:

          'Enter the patient name or Patient ID/NIC.'

      });

    }





    const matches =

      await findMatchingPatients({

        name,

        patientIdentifier,

        phone

      });





    // No real patient

    if (matches.length === 0) {

      return res.status(404).json({

        success: false,

        message:

          'No active patient record matched the provided details.'

      });

    }





    // Avoid selecting the wrong patient

    if (matches.length > 1) {

      return res.status(409).json({

        success: false,

        message:

          'More than one patient matches this name. Please enter the registered phone number or Patient ID/NIC.'

      });

    }





    const patient =

      matches[0];





    return res.status(200).json({

      success: true,



      data: {

        patientId:

          patient.patientId,



        firstName:

          patient.firstName,



        lastName:

          patient.lastName,



        nic:

          patient.nic || '',



        status:

          patient.status

      },



      message:

        'Matching patient record found.'

    });



  } catch (error) {

    console.error(

      'Search Patient Error:',

      error

    );



    return res.status(500).json({

      success: false,



      message:

        'Unable to search for patient.'

    });

  }

};





// ======================================================

// CREATE - LINK PATIENT

// POST /api/links

// ======================================================



exports.linkPatient = async (

  req,

  res

) => {

  try {

    const {

      patientIdentifier,

      phone,

      relationship,

      name

    } = req.body;





    if (

      !patientIdentifier ||

      !relationship

    ) {

      return res.status(400).json({

        success: false,



        message:

          'Patient ID/NIC and relationship are required.'

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





    if (!caregiver.caregiverId) {

      return res.status(400).json({

        success: false,



        message:

          'Caregiver ID is missing from this account.'

      });

    }





    // Use same flexible matching used by Search

    const matches =

      await findMatchingPatients({

        name,

        patientIdentifier,

        phone

      });





    if (matches.length === 0) {

      return res.status(404).json({

        success: false,



        message:

          'No matching patient found using the provided details.'

      });

    }





    if (matches.length > 1) {

      return res.status(409).json({

        success: false,



        message:

          'Multiple patient records matched. Please provide more precise patient details.'

      });

    }





    const patient =

      matches[0];





    const existingLink =

      await CaregiverLink.findOne({

        caregiverId:

          caregiver.caregiverId,



        patientId:

          patient.patientId

      });





    if (

      existingLink &&

      existingLink.status !==

        'revoked'

    ) {

      return res.status(409).json({

        success: false,



        message:

          'This patient is already linked to this caregiver.'

      });

    }





    // Restore revoked link

    if (

      existingLink &&

      existingLink.status ===

        'revoked'

    ) {

      existingLink.relationship =

        relationship;



      existingLink.status =

        'pending';



      existingLink.verified =

        false;



      existingLink.verifiedBy =

        null;



      existingLink.verifiedAt =

        null;



      existingLink.linkedAt =

        new Date();





      await existingLink.save();





      return res.status(200).json({

        success: true,



        data: {

          link:

            existingLink,



          patient: {

            patientId:

              patient.patientId,



            firstName:

              patient.firstName,



            lastName:

              patient.lastName

          }

        },



        message:

          'Patient link request created successfully.'

      });

    }





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

          patientId:

            patient.patientId,



          firstName:

            patient.firstName,



          lastName:

            patient.lastName

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

// READ - GET CAREGIVER'S LINKED PATIENTS

// ======================================================



exports.getLinkedPatients = async (

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





    const links =

      await CaregiverLink.find({

        caregiverId:

          caregiver.caregiverId,



        status: {

          $ne:

            'revoked'

        }

      })

        .sort({

          createdAt: -1

        });





    const result = [];





    for (const link of links) {

      const patient =

        await User.findOne({

          patientId:

            link.patientId

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



      data:

        result,



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

// READ - LINKED PATIENT STATUS

// ======================================================



exports.getLinkedPatientStatus =

  async (req, res) => {

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





      const patient =

        await User.findOne({

          patientId:

            link.patientId,



          role:

            'patient'

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





      const {

        token,

        liveQueue

      } =

        await getPatientQueueStatus(

          link.patientId

        );





      return res.status(200).json({

        success: true,



        data: {

          link: {

            linkId:

              link.linkId,



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



          consultation:

            null

        },



        message:

          token

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

// READ - LINKED PATIENT NOTIFICATIONS

// ======================================================



exports.getLinkedPatientNotifications =

  async (req, res) => {

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





      const result =

        await getCaregiverSafeQueueNotifications(
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

          'Linked patient queue notifications retrieved successfully.'

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

// UPDATE RELATIONSHIP

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

          $ne:

            'revoked'

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



      data:

        link,



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

// DELETE - UNLINK PATIENT

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

          $ne:

            'revoked'

        }

      });





    if (!link) {

      return res.status(404).json({

        success: false,



        message:

          'Caregiver link not found.'

      });

    }





    link.status =

      'revoked';



    link.verified =

      false;





    await link.save();





    return res.status(200).json({

      success: true,



      data:

        link,



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

// ADMIN - VERIFY / REJECT LINK

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





    if (

      action ===

      'verify'

    ) {

      link.verified =

        true;



      link.status =

        'active';



      link.verifiedBy =

        req.user.userId;



      link.verifiedAt =

        new Date();

    }





    if (

      action ===

      'reject'

    ) {

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



      data:

        link,



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