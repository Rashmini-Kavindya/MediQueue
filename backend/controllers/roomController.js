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

// UPDATE ROOM
exports.updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { roomNumber, name, opdId, status } = req.body;

    const updatedRoom = await Room.findOneAndUpdate(
  { roomId },
  { roomNumber, name, opdId, status },
  { returnDocument: 'after', runValidators: true }
);

    if (!updatedRoom) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.status(200).json({ success: true, data: updatedRoom, message: 'Room updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// SOFT DELETE / DEACTIVATE ROOM
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOneAndUpdate(
  { roomId },
  { status: 'inactive' },
  { returnDocument: 'after' }
);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.status(200).json({ success: true, message: 'Room deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};