const Doctor = require('../models/Doctor');
const { generateId } = require('../utils/id');

exports.createDoctor = async (req, res) => {
  try {
    const { name, specialization, opdIds, roomId } = req.body;
    const doctorId = generateId('DOC');

    const newDoctor = new Doctor({ doctorId, name, specialization, opdIds, roomId });
    await newDoctor.save();

    res.status(201).json({ success: true, data: newDoctor, message: 'Doctor created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: 'active' });
    res.status(200).json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};