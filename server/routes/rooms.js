const express = require("express");
const Room = require("../models/Room");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Generate a random 6-char room code
const generateRoomId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// POST /api/rooms  — create a room
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, isPrivate, focusDuration, breakDuration } = req.body;

    let roomId;
    let exists = true;
    // Keep generating until unique
    while (exists) {
      roomId = generateRoomId();
      exists = await Room.findOne({ roomId });
    }

    const room = await Room.create({
      roomId,
      name: name || `${req.user.username}'s Room`,
      host: req.user.username,
      isPrivate: isPrivate || false,
      focusDuration: focusDuration || 25,
      breakDuration: breakDuration || 5,
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/public  — list public rooms
router.get("/public", async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .select("roomId name host focusDuration createdAt")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rooms/:roomId  — get single room
router.get("/:roomId", async (req, res) => {
  try {
    const room = await Room.findOne({
      roomId: req.params.roomId.toUpperCase(),
    });
    if (!room) return res.status(404).json({ message: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
