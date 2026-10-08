const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const CaregiverLink = require('../models/CaregiverLink');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateId } = require('../utils/id');

const VALID_ROLES = ['patient', 'caregiver', 'staff', 'admin'];
const VALID_STATUSES = ['active', 'inactive', 'pending'];
const VALID_LANGUAGES = ['en', 'si', 'ta'];
const safeFields = '-passwordHash -otpCodeHash -otpExpiresAt';
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const text = (value) => typeof value === 'string' ? value.trim() : '';
const fail = (res, error, label) => {
  console.error(label, error);
  if (error?.code === 11000) return res.status(409).json({ success: false, message: 'Email or ID already exists.' });
  if (error?.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Invalid user details.' });
  return res.status(500).json({ success: false, message: label });
};

// When patient/caregiver access is deactivated, revoke their links but
// do not delete patients, caregiver links, tokens, or hospital history.
const revokeCaregiverLinks = async (user) => {
  if (user.role === 'caregiver' && user.caregiverId) {
    await CaregiverLink.updateMany(
      { caregiverId: user.caregiverId, status: { $ne: 'revoked' } },
      { $set: { status: 'revoked', verified: false } }
    );
  }
  if (user.role === 'patient' && user.patientId) {
    await CaregiverLink.updateMany(
      { patientId: user.patientId, status: { $ne: 'revoked' } },
      { $set: { status: 'revoked', verified: false } }
    );
  }
};

// CREATE - Admin creates staff (as specified in Milestone 03).
// Patient and caregiver registration must use the OTP/consent flow.
exports.createStaffUser = async (req, res) => {
  try {
    const firstName = text(req.body.firstName);
    const lastName = text(req.body.lastName);
    const email = text(req.body.email).toLowerCase();
    const phone = text(req.body.phone);
    const nic = text(req.body.nic).toUpperCase();
    const password = req.body.password;
    const language = req.body.language || 'en';
    if (!firstName || !lastName || !email || !phone || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'First name, last name, email, phone and password (minimum 6 characters) are required.' });
    }
    if (firstName.length > 70 || lastName.length > 70 || !/^\S+@\S+\.\S+$/.test(email) || !VALID_LANGUAGES.includes(language)) {
      return res.status(400).json({ success: false, message: 'Enter valid names, email and language.' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email is already registered.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const staff = await User.create({
      userId: generateId('USR'), staffId: generateId('STF'),
      firstName, lastName, email, phone, nic: nic || undefined, passwordHash,
      role: 'staff', language, status: 'active', adminProvisioned: true
    });
    const publicStaff = await User.findById(staff._id).select(safeFields);
    return res.status(201).json({ success: true, data: publicStaff, message: 'Staff account created successfully.' });
  } catch (error) { return fail(res, error, 'Unable to create staff account.'); }
};

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
      if (!cleaned && ['firstName','lastName','phone','email'].includes(key)) {
        return res.status(400).json({ success: false, message: `${key} is required.` });
      }
      if (key === 'status' && !VALID_STATUSES.includes(cleaned)) return res.status(400).json({ success: false, message: 'Invalid status.' });
      if (key === 'language' && !VALID_LANGUAGES.includes(cleaned)) return res.status(400).json({ success: false, message: 'Invalid language.' });
      if (key === 'email' && !/^\S+@\S+\.\S+$/.test(cleaned)) return res.status(400).json({ success: false, message: 'Invalid email.' });
      if (['firstName','lastName'].includes(key) && cleaned.length > 70) return res.status(400).json({ success: false, message: 'Name too long.' });
      if (key === 'status' && user.userId === req.user.userId && cleaned !== user.status) {
        return res.status(403).json({ success: false, message: 'You cannot change your own admin account status.' });
      }
      user[key] = key === 'email' ? cleaned.toLowerCase() : cleaned;
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
