const WaitingArea = require('../models/WaitingArea');

const TYPES = ['lobby', 'canteen', 'waiting_hall', 'other'];
const STATUSES = ['active', 'inactive'];

const parsePayload = (source, partial = false) => {
  const input = source || {};
  const result = {};
  const error = (message) => ({ error: message });

  for (const key of ['name', 'type', 'location', 'nearbyLandmark', 'status']) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    if (typeof input[key] !== 'string') return error(`${key} must be text.`);
    result[key] = input[key].trim();
  }
  if (!partial && (!result.name || !result.type || !result.location || input.seating === undefined)) {
    return error('Name, type, location, and seating capacity are required.');
  }
  if (result.name !== undefined && (!result.name || result.name.length > 100)) {
    return error('Area name must be 1 to 100 characters.');
  }
  if (result.location !== undefined && (!result.location || result.location.length > 160)) {
    return error('Location must be 1 to 160 characters.');
  }
  if (result.nearbyLandmark !== undefined && result.nearbyLandmark.length > 180) {
    return error('Nearby landmark is too long.');
  }
  if (result.type !== undefined && !TYPES.includes(result.type)) {
    return error('Invalid waiting area type.');
  }
  if (result.status !== undefined && !STATUSES.includes(result.status)) {
    return error('Invalid waiting area status.');
  }
  if (input.seating !== undefined) {
    const seating = Number(input.seating);
    if (input.seating === '' || !Number.isInteger(seating) || seating < 0 || seating > 10000) {
      return error('Seating capacity must be a whole number between 0 and 10000.');
    }
    result.seating = seating;
  }
  // Legacy distance is accepted if another client still supplies it.
  if (input.distance !== undefined) {
    const distance = Number(input.distance);
    if (input.distance === '' || !Number.isFinite(distance) || distance < 0) {
      return error('Distance must be a non-negative number.');
    }
    result.distance = distance;
  }
  return { value: result };
};

const sendError = (res, error, message) => {
  console.error(message, error);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid waiting area details.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'Waiting area already exists.' });
  }
  return res.status(500).json({ success: false, message });
};

// CREATE - Admin
exports.createWaitingArea = async (req, res) => {
  try {
    const parsed = parsePayload(req.body);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
    const waitingArea = await WaitingArea.create(parsed.value);
    return res.status(201).json({ success: true, data: waitingArea, message: 'Waiting area created successfully.' });
  } catch (error) {
    return sendError(res, error, 'Unable to create waiting area.');
  }
};

// READ - Public to authenticated patients/caregivers; active only
exports.getWaitingAreas = async (req, res) => {
  try {
    const waitingAreas = await WaitingArea.find({ status: 'active' }).sort({ distance: 1, name: 1 });
    return res.json({ success: true, data: waitingAreas, message: 'Waiting areas retrieved successfully.' });
  } catch (error) {
    return sendError(res, error, 'Unable to retrieve waiting areas.');
  }
};

// READ - Admin; includes inactive
exports.getAllWaitingAreas = async (req, res) => {
  try {
    const waitingAreas = await WaitingArea.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: waitingAreas, message: 'All waiting areas retrieved successfully.' });
  } catch (error) {
    return sendError(res, error, 'Unable to retrieve waiting areas.');
  }
};

// UPDATE - Admin
exports.updateWaitingArea = async (req, res) => {
  try {
    const parsed = parsePayload(req.body, true);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
    const waitingArea = await WaitingArea.findOne({ waitingAreaId: req.params.id });
    if (!waitingArea) return res.status(404).json({ success: false, message: 'Waiting area not found.' });
    Object.assign(waitingArea, parsed.value);
    await waitingArea.save();
    return res.json({ success: true, data: waitingArea, message: 'Waiting area updated successfully.' });
  } catch (error) {
    return sendError(res, error, 'Unable to update waiting area.');
  }
};

// DELETE - Admin; permanent removal of waiting-area record only
exports.deleteWaitingArea = async (req, res) => {
  try {
    const waitingArea = await WaitingArea.findOneAndDelete({ waitingAreaId: req.params.id });
    if (!waitingArea) return res.status(404).json({ success: false, message: 'Waiting area not found.' });
    return res.json({ success: true, data: { waitingAreaId: waitingArea.waitingAreaId }, message: 'Waiting area permanently deleted.' });
  } catch (error) {
    return sendError(res, error, 'Unable to delete waiting area.');
  }
};
