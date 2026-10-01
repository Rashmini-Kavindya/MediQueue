const Room = require('../models/Room');
const { generateId } = require('../utils/id');

exports.createRoom = async (req, res) => {
  try {
    const { roomNumber, name, opdId } = req.body;
    const roomId = generateId('ROM');

    const newRoom = new Room({ roomId, roomNumber, name, opdId });
    await newRoom.save();

    res.status(201).json({ success: true, data: newRoom, message: 'Room created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ status: 'active' });
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};