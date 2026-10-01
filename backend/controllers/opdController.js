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