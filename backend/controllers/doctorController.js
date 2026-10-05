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

// UPDATE DOCTOR
exports.updateDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { name, specialization, opdIds, roomId, status } = req.body;

    const updatedDoctor = await Doctor.findOneAndUpdate(
  { doctorId },
  { name, specialization, opdIds, roomId, status },
  { returnDocument: 'after', runValidators: true }
);

    if (!updatedDoctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, data: updatedDoctor, message: 'Doctor updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SOFT DELETE / DEACTIVATE DOCTOR
exports.deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOneAndUpdate(
  { doctorId },
  { status: 'inactive' },
  { returnDocument: 'after' }
);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, message: 'Doctor deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};