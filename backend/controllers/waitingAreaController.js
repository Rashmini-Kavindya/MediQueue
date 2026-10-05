const WaitingArea = require('../models/WaitingArea');

// ======================================================
// CREATE - Admin adds waiting area
// ======================================================
exports.createWaitingArea = async (req, res) => {
  try {
    const {
      name,
      type,
      location,
      seating,
      distance,
      status
    } = req.body;

    if (
      !name ||
      !type ||
      !location ||
      seating === undefined ||
      distance === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, location, seating and distance are required.'
      });
    }

    const waitingArea = await WaitingArea.create({
      name,
      type,
      location,
      seating,
      distance,
      status: status || 'active'
    });

    return res.status(201).json({
      success: true,
      data: waitingArea,
      message: 'Waiting area created successfully.'
    });

  } catch (error) {
    console.error('Create Waiting Area Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create waiting area.'
    });
  }
};


// ======================================================
// READ - Public/authenticated users view active areas
// ======================================================
exports.getWaitingAreas = async (req, res) => {
  try {
    const waitingAreas = await WaitingArea.find({
      status: 'active'
    }).sort({ distance: 1 });

    return res.status(200).json({
      success: true,
      data: waitingAreas,
      message: 'Waiting areas retrieved successfully.'
    });

  } catch (error) {
    console.error('Get Waiting Areas Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve waiting areas.'
    });
  }
};


// ======================================================
// READ - Admin view including inactive areas
// ======================================================
exports.getAllWaitingAreas = async (req, res) => {
  try {
    const waitingAreas = await WaitingArea.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: waitingAreas,
      message: 'All waiting areas retrieved successfully.'
    });

  } catch (error) {
    console.error('Get All Waiting Areas Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve waiting areas.'
    });
  }
};


// ======================================================
// UPDATE - Admin edits waiting area
// ======================================================
exports.updateWaitingArea = async (req, res) => {
  try {
    const waitingArea = await WaitingArea.findOne({
      waitingAreaId: req.params.id
    });

    if (!waitingArea) {
      return res.status(404).json({
        success: false,
        message: 'Waiting area not found.'
      });
    }

    const {
      name,
      type,
      location,
      seating,
      distance,
      status
    } = req.body;

    if (name !== undefined) waitingArea.name = name;
    if (type !== undefined) waitingArea.type = type;
    if (location !== undefined) waitingArea.location = location;
    if (seating !== undefined) waitingArea.seating = seating;
    if (distance !== undefined) waitingArea.distance = distance;
    if (status !== undefined) waitingArea.status = status;

    await waitingArea.save();

    return res.status(200).json({
      success: true,
      data: waitingArea,
      message: 'Waiting area updated successfully.'
    });

  } catch (error) {
    console.error('Update Waiting Area Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update waiting area.'
    });
  }
};


// ======================================================
// DELETE - Admin removes waiting area
// ======================================================
exports.deleteWaitingArea = async (req, res) => {
  try {
    const waitingArea = await WaitingArea.findOne({
      waitingAreaId: req.params.id
    });

    if (!waitingArea) {
      return res.status(404).json({
        success: false,
        message: 'Waiting area not found.'
      });
    }

    await WaitingArea.deleteOne({
      waitingAreaId: req.params.id
    });

    return res.status(200).json({
      success: true,
      data: {
        waitingAreaId: waitingArea.waitingAreaId
      },
      message: 'Waiting area deleted successfully.'
    });

  } catch (error) {
    console.error('Delete Waiting Area Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete waiting area.'
    });
  }
};