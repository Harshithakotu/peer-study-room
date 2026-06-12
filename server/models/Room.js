const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
    createdBy: { type: String, required: true }, // username
  },
  { timestamps: true }
);

const pomodoroSessionSchema = new mongoose.Schema({
  phase: { type: String, enum: ["focus", "break"], required: true },
  completedAt: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    host: {
      type: String, // username of host
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    todos: [todoSchema],
    sessions: [pomodoroSessionSchema],
    focusDuration: { type: Number, default: 25 },  // minutes
    breakDuration: { type: Number, default: 5 },   // minutes
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", roomSchema);
