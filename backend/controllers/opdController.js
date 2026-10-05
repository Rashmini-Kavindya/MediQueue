const OPD = require('../models/OPD');
const { generateId } = require('../utils/id');

exports.createOpd = async (req, res) => {
  try {
    const { name, department, roomId, doctorIds, avgConsultMinutes } = req.body;
    const opdId = generateId('OPD');

    const newOpd = new OPD({ opdId, name, department, roomId, doctorIds, avgConsultMinutes });
    await newOpd.save();

    res.status(201).json({ success: true, data: newOpd, message: 'OPD created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOpds = async (req, res) => {
  try {
    const opds = await OPD.find({ status: 'active' });
    res.status(200).json({ success: true, data: opds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE OPD
exports.updateOpd = async (req, res) => {
  try {
    const { opdId } = req.params;
    const { name, department, roomId, doctorIds, avgConsultMinutes, status } = req.body;

    // updateOpd
const updatedOpd = await OPD.findOneAndUpdate(
  { opdId },
  { name, department, roomId, doctorIds, avgConsultMinutes, status },
  { returnDocument: 'after', runValidators: true }
);

    if (!updatedOpd) {
      return res.status(404).json({ success: false, message: 'OPD not found' });
    }

    res.status(200).json({ success: true, data: updatedOpd, message: 'OPD updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SOFT DELETE / DEACTIVATE OPD
exports.deleteOpd = async (req, res) => {
  try {
    const { opdId } = req.params;

   const opd = await OPD.findOneAndUpdate(
  { opdId },
  { status: 'inactive' },
  { returnDocument: 'after' }
);

    if (!opd) {
      return res.status(404).json({ success: false, message: 'OPD not found' });
    }

    res.status(200).json({ success: true, message: 'OPD deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};