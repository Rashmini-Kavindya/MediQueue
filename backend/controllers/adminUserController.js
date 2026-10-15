const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const CaregiverLink = require('../models/CaregiverLink');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateId } = require('../utils/id');

const VALID_ROLES = ['patient', 'caregiver', 'staff', 'admin'];
const CREATE_ROLES = ['patient', 'staff', 'admin']; // Doctor module remains separate.
const VALID_STATUSES = ['active', 'inactive', 'pending'];
const VALID_LANGUAGES = ['en', 'si', 'ta'];
const safeFields = '-passwordHash -otpCodeHash -otpExpiresAt';
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const text = value => typeof value === 'string' ? value.trim() : '';
// A basic mobile phone capable of receiving SMS is sufficient.
const normalizeSmsPhone = value => {
  const raw = text(value).replace(/[\s()-]/g, '');
  const local = raw.startsWith('+94') ? `0${raw.slice(3)}` :
    raw.startsWith('94') ? `0${raw.slice(2)}` : raw;
  return /^07\d{8}$/.test(local) ? local : null;
};
const smsPhoneVariants = local => [local, `94${local.slice(1)}`, `+94${local.slice(1)}`];
const fail = (res, error, label) => {
  console.error(label, error);
  if (error?.code === 11000) return res.status(409).json({ success: false, message: 'Email or ID already exists.' });
  if (error?.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Invalid user details.' });
  return res.status(500).json({ success: false, message: label });
};

// Preserve existing caregiver-link revocation when users are deactivated.
const revokeCaregiverLinks = async user => {
  if (user.role === 'caregiver' && user.caregiverId) {
    await CaregiverLink.updateMany(
      { caregiverId:user.caregiverId, status:{ $ne:'revoked' } },
      { $set:{ status:'revoked', verified:false } }
    );
  }
  if (user.role === 'patient' && user.patientId) {
    await CaregiverLink.updateMany(
      { patientId:user.patientId, status:{ $ne:'revoked' } },
      { $set:{ status:'revoked', verified:false } }
    );
  }
};

// Admin creates Patient / Staff / Admin; route is already restricted to admin.
// Patients: SMS-capable phone required, email optional, no password issued.
// Doctors: not created here; handled by the team's separate Doctor module.
exports.createUser = async (req, res) => {
  try {
    const role = text(req.body.role) || 'staff'; // old callers retain staff-only behavior
    if (!CREATE_ROLES.includes(role)) {
      return res.status(400).json({ success:false, message:'Choose Patient, Staff or Admin.' });
    }
    const firstName = text(req.body.firstName);
    const lastName = text(req.body.lastName);
    const email = text(req.body.email).toLowerCase();
    const phone = text(req.body.phone);
    const normalizedPhone = normalizeSmsPhone(phone);
    const nic = text(req.body.nic).toUpperCase();
    const language = req.body.language || 'en';
    const password = req.body.password;

    if (!firstName || !lastName || firstName.length > 70 || lastName.length > 70) {
      return res.status(400).json({ success:false, message:'Valid first and last names are required (max 70 characters).' });
    }
    if (!VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ success:false, message:'Invalid language.' });
    }
    if (!normalizedPhone) {
      return res.status(400).json({ success:false, message:'A valid Sri Lankan SMS-capable mobile number is required (e.g., 0771234567).' });
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success:false, message:'Enter a valid email address.' });
    }
    if (role !== 'patient') {
      const minLength = role === 'admin' ? 10 : 6;
      if (!email || !phone || typeof password !== 'string' || password.length < minLength) {
        return res.status(400).json({ success:false,
          message:`Email, phone and password (minimum ${minLength} characters) are required for ${role}.` });
      }
    }

    // Do not overwrite existing identities, including deactivated users.
    const duplicates = [];
    duplicates.push({ phone: { $in:smsPhoneVariants(normalizedPhone) } });
    if (email) duplicates.push({ email });
    if (nic) duplicates.push({ nic: { $in:[nic, nic.toLowerCase()] } });
    if (duplicates.length && await User.findOne({ $or:duplicates })) {
      return res.status(409).json({ success:false, message:'A user with this phone number, email or NIC already exists.' });
    }

    const ids = {
      userId:generateId('USR'),
      ...(role === 'patient' ? { patientId:generateId('PAT') } : {}),
      ...(role === 'staff' ? { staffId:generateId('STF') } : {}),
      ...(role === 'admin' ? { adminId:generateId('ADM') } : {})
    };
    // This password is never shown to the patient and is computationally unguessable.
    // It does not establish identity or count as verification/consent.
    const secret = role === 'patient' ? crypto.randomBytes(48).toString('hex') : password;
    const passwordHash = await bcrypt.hash(secret, 10);
    const user = await User.create({
      ...ids, firstName, lastName,
      ...(email ? { email } : {}),
      phone: normalizedPhone,
      ...(nic ? { nic } : {}),
      passwordHash, role, language, status:'active', adminProvisioned:true
    });
    const safeUser = await User.findById(user._id).select(safeFields);
    return res.status(201).json({
      success:true,
      data:safeUser,
      message:role === 'patient'
        ? 'Patient record created. Caregiver access requires verified consent.'
        : `${role === 'admin' ? 'Admin' : 'Staff'} account created successfully.`
    });
  } catch (error) { return fail(res, error, 'Unable to create user account.'); }
};

// Backwards compatibility for the existing adminUserRoutes.js POST handler.
exports.createStaffUser = exports.createUser;

// READ - Admin list/search/filter

exports.getUsers = async (req, res) => {

  try {

    const { search, role, status } = req.query;

    if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role filter.' });

    if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status filter.' });

    const filter = {};

    if (role) filter.role = role;

    if (status) filter.status = status;

    if (search && String(search).trim()) {

      const s = escapeRegex(String(search).trim().slice(0, 80));

      filter.$or = ['userId','patientId','caregiverId','staffId','adminId','firstName','lastName','email','phone','nic']

        .map(k => ({ [k]: { $regex: s, $options: 'i' } }));

    }

    const users = await User.find(filter).select(safeFields).sort({ createdAt: -1 });

    return res.json({ success: true, data: users, message: 'Users retrieved successfully.' });

  } catch (error) { return fail(res, error, 'Unable to retrieve users.'); }

};



// READ - Single user

exports.getUserById = async (req, res) => {

  try {

    const user = await User.findOne({ userId: req.params.id }).select(safeFields);

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    return res.json({ success: true, data: user, message: 'User retrieved successfully.' });

  } catch (error) { return fail(res, error, 'Unable to retrieve user.'); }

};



// UPDATE - Edit user or reactivate; roles/IDs/passwords cannot be changed here.

exports.updateUser = async (req, res) => {

  try {

    const user = await User.findOne({ userId: req.params.id });

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const allowed = ['firstName', 'lastName', 'email', 'phone', 'nic', 'language', 'status'];

    for (const key of allowed) {

      if (!Object.prototype.hasOwnProperty.call(req.body, key)) continue;

      if (typeof req.body[key] !== 'string') {

        return res.status(400).json({ success: false, message: `${key} must be text.` });

      }

      const cleaned = text(req.body[key]);

      if (!cleaned && (['firstName','lastName','phone'].includes(key) || (user.role !== 'patient' && key === 'email'))) {

        return res.status(400).json({ success: false, message: `${key} is required.` });

      }

      if (key === 'status' && !VALID_STATUSES.includes(cleaned)) return res.status(400).json({ success: false, message: 'Invalid status.' });

      if (key === 'language' && !VALID_LANGUAGES.includes(cleaned)) return res.status(400).json({ success: false, message: 'Invalid language.' });

      if (key === 'email' && cleaned && !/^\S+@\S+\.\S+$/.test(cleaned)) return res.status(400).json({ success: false, message: 'Invalid email.' });
      if (key === 'phone') {
        // Preserve existing legacy/Google phone values if the admin edits other fields.
        if (cleaned === text(user.phone)) continue;
        const validPhone = normalizeSmsPhone(cleaned);
        if (!validPhone) return res.status(400).json({ success: false, message: 'Enter a valid Sri Lankan mobile number (e.g., 0771234567).' });
        if (validPhone !== normalizeSmsPhone(user.phone)) {
          const duplicate = await User.findOne({
            userId:{ $ne:user.userId },
            phone:{ $in:smsPhoneVariants(validPhone) }
          });
          if (duplicate) return res.status(409).json({ success: false, message:'Phone number is already registered.' });
        }
        user.phone = validPhone;
        continue;
      }

      if (['firstName','lastName'].includes(key) && cleaned.length > 70) return res.status(400).json({ success: false, message: 'Name too long.' });

      if (key === 'status' && user.userId === req.user.userId && cleaned !== user.status) {

        return res.status(403).json({ success: false, message: 'You cannot change your own admin account status.' });

      }

      user[key] = (user.role === 'patient' && key === 'email' && !cleaned)
          ? undefined
          : (key === 'email' ? cleaned.toLowerCase() : cleaned);

    }

    if (user.isModified('status') && user.status === 'inactive') await revokeCaregiverLinks(user);

    await user.save();

    const updated = await User.findById(user._id).select(safeFields);

    return res.json({ success: true, data: updated, message: 'User updated successfully.' });

  } catch (error) { return fail(res, error, 'Unable to update user.'); }

};



// DELETE (soft) - Admin deactivates

exports.deactivateUser = async (req, res) => {

  try {

    const user = await User.findOne({ userId: req.params.id });

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.userId === req.user.userId) return res.status(403).json({ success: false, message: 'You cannot deactivate your own admin account.' });

    if (user.status !== 'inactive') {

      await revokeCaregiverLinks(user);

      user.status = 'inactive';

      await user.save();

    }

    return res.json({ success: true, data: { userId: user.userId, role: user.role, status: user.status }, message: 'User deactivated successfully.' });

  } catch (error) { return fail(res, error, 'Unable to deactivate user.'); }

};



// PERMANENT DELETE - Staff accounts only.

// This operation is independent from deactivate/reactivate:

// an active or inactive staff account can be deleted, but ONLY when

// no related hospital data is found. Patients, caregivers, and admins

// must not be hard-deleted through this staff-management endpoint.

exports.permanentlyDeleteStaffUser = async (req, res) => {

  try {

    const user = await User.findOne({ userId: req.params.id });

    if (!user) {

      return res.status(404).json({

        success: false,

        message: 'User not found.'

      });

    }



    if (user.userId === req.user.userId) {

      return res.status(403).json({

        success: false,

        message: 'You cannot delete your own account.'

      });

    }



    if (user.role !== 'staff') {

      return res.status(403).json({

        success: false,

        message: 'Permanent deletion here is for staff accounts only. Deactivate patient, caregiver and admin accounts instead.'

      });

    }



    // Before deleting a staff member, check for references in hospital

    // data. A referenced staff record must be kept for audit/history.

    // No clinical or other hospital records are modified by this action.

    const identifiers = [user.userId, user.staffId, String(user._id), user.email]

      .filter(Boolean);

    const values = [...identifiers, user._id].filter(Boolean);

    const referenceFields = [

      'userId', 'staffId', 'doctorId', 'staffUserId', 'doctorUserId',

      'assignedStaffId', 'assignedTo', 'createdBy', 'updatedBy',

      'senderId', 'recipientId', 'prescribedBy', 'performedBy',

      'approvedBy', 'recordedBy', 'email', 'staffEmail',

      'doctor.userId', 'doctor.staffId', 'staff.userId',

      'assignedTo.userId', 'createdBy.userId'

    ];

    const referenceQuery = {

      $or: referenceFields.map(field => ({ [field]: { $in: values } }))

    };



    // Check ALL current non-user collections, including doctors,

    // consultations, tokens and future hospital collections, for

    // the known reference fields. Fail closed if the scan errors.

    const collections = await mongoose.connection.db

      .listCollections({}, { nameOnly: true }).toArray();



    for (const { name } of collections) {

      if (name === 'users' || name === 'userpreferences' || name.startsWith('system.')) {

        continue;

      }

      const related = await mongoose.connection.db.collection(name).findOne(

        referenceQuery,

        { projection: { _id: 1 } }

      );

      if (related) {

        return res.status(409).json({

          success: false,

          message: 'Cannot delete this staff account because it is linked to existing records. You can deactivate it instead.'

        });

      }

    }



    // Delete only the staff user's login/account document, followed

    // by its personal settings. Other collections remain untouched.

    const result = await User.deleteOne({ _id: user._id, role: 'staff' });

    if (result.deletedCount !== 1) {

      return res.status(409).json({

        success: false,

        message: 'Staff account could not be deleted. Refresh and try again.'

      });

    }



    // Cleanup of profile preferences is best effort. It must not cause

    // a false failure response after the actual user was deleted.

    try {

      await UserPreference.deleteMany({ userId: user.userId });

    } catch (cleanupError) {

      console.error('Staff preferences cleanup failed:', cleanupError);

    }



    return res.status(200).json({

      success: true,

      data: { userId: user.userId },

      message: 'Staff account permanently deleted.'

    });

  } catch (error) {

    return fail(res, error, 'Unable to permanently delete staff account.');

  }

};
