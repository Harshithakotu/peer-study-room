require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const connectDB = require("./db");
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const timer = require("./timerEngine");
const roomManager = require("./roomManager");
const Room = require("./models/Room");
const User = require("./models/User");

connectDB();

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);

    const allowed = [process.env.CLIENT_URL].filter(Boolean);
    const isVercel = origin.endsWith(".vercel.app");
    const isAllowed = allowed.includes(origin) || isVercel;

    if (isAllowed) return callback(null, true);
    console.warn("CORS blocked origin:", origin);
    callback(null, true); // temporarily allow all
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "ok", message: "Study Room API running" }));
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.use((err, req, res, next) => {
  console.error("Express error:", err.message);
  res.status(500).json({ message: err.message || "Internal server error" });
});

function toPlain(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(toPlain);
  if (typeof doc.toObject === "function") return doc.toObject();
  return doc;
}

function systemMsg(text) {
  return {
    id: "sys-" + Date.now(),
    username: "system",
    text,
    timestamp: new Date().toISOString(),
    type: "system",
  };
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", async (socket) => {
  try {
    const user = await User.findById(socket.userId);
    if (!user) return socket.disconnect();
    socket.username = user.username;
    console.log(user.username + " connected [" + socket.id + "]");

    socket.on("room:join", async ({ roomId }) => {
      try {
        const upperRoomId = roomId.toUpperCase();
        const room = await Room.findOne({ roomId: upperRoomId });
        if (!room) { socket.emit("error", { message: "Room not found" }); return; }

        socket.join(upperRoomId);
        socket.currentRoom = upperRoomId;
        roomManager.joinRoom(upperRoomId, socket.id, socket.username);
        timer.createRoom(upperRoomId, room.focusDuration, room.breakDuration);

        socket.emit("timer:sync", timer.getState(upperRoomId));
        socket.emit("users:list", roomManager.getUsers(upperRoomId));
        socket.emit("todos:list", toPlain(room.todos));

        socket.to(upperRoomId).emit("user:joined", {
          username: socket.username,
          users: roomManager.getUsers(upperRoomId),
        });
        socket.to(upperRoomId).emit("chat:message", systemMsg(socket.username + " joined the room"));
        console.log(socket.username + " joined room " + upperRoomId);
      } catch (err) {
        console.error("room:join error:", err.message);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("timer:start", () => {
      const roomId = socket.currentRoom;
      if (!roomId) return;
      timer.startTimer(roomId, io, async (rId) => {
        try {
          await Room.findOneAndUpdate(
            { roomId: rId },
            { $push: { sessions: { phase: "focus", completedAt: new Date() } } }
          );
          await User.findByIdAndUpdate(socket.userId, {
            $inc: { totalPomodoros: 1, totalFocusMinutes: 25 },
          });
        } catch (err) { console.error("timer callback error:", err.message); }
      });
    });

    socket.on("timer:pause", () => {
      const roomId = socket.currentRoom;
      if (!roomId) return;
      timer.pauseTimer(roomId);
      io.to(roomId).emit("timer:paused", timer.getState(roomId));
    });

    socket.on("timer:reset", () => {
      const roomId = socket.currentRoom;
      if (!roomId) return;
      timer.resetTimer(roomId, io);
    });

    socket.on("todo:add", async ({ text }) => {
      try {
        const roomId = socket.currentRoom;
        if (!roomId || !text || !text.trim()) return;
        const updatedRoom = await Room.findOneAndUpdate(
          { roomId },
          { $push: { todos: { text: text.trim(), done: false, createdBy: socket.username } } },
          { new: true }
        );
        const todos = toPlain(updatedRoom.todos);
        io.to(roomId).emit("todo:added", todos[todos.length - 1]);
      } catch (err) { console.error("todo:add error:", err.message); }
    });

    socket.on("todo:toggle", async ({ todoId }) => {
      try {
        const roomId = socket.currentRoom;
        if (!roomId) return;
        const room = await Room.findOne({ roomId });
        const todo = room.todos.id(todoId);
        if (!todo) return;
        todo.done = !todo.done;
        await room.save();
        io.to(roomId).emit("todo:updated", { todoId, done: todo.done });
      } catch (err) { console.error("todo:toggle error:", err.message); }
    });

    socket.on("todo:delete", async ({ todoId }) => {
      try {
        const roomId = socket.currentRoom;
        if (!roomId) return;
        await Room.findOneAndUpdate({ roomId }, { $pull: { todos: { _id: todoId } } });
        io.to(roomId).emit("todo:deleted", { todoId });
      } catch (err) { console.error("todo:delete error:", err.message); }
    });

    socket.on("chat:send", ({ text }) => {
      const roomId = socket.currentRoom;
      if (!roomId || !text || !text.trim()) return;
      const message = {
        id: Date.now() + "-" + socket.id,
        username: socket.username,
        text: text.trim().slice(0, 300),
        timestamp: new Date().toISOString(),
        type: "message",
      };
      io.to(roomId).emit("chat:message", message);
    });

    socket.on("disconnect", () => {
      const roomId = socket.currentRoom;
      if (roomId) {
        roomManager.leaveRoom(roomId, socket.id);
        socket.to(roomId).emit("user:left", {
          username: socket.username,
          users: roomManager.getUsers(roomId),
        });
        socket.to(roomId).emit("chat:message", systemMsg(socket.username + " left the room"));
        console.log(socket.username + " left room " + roomId);
      }
      console.log(socket.username + " disconnected");
    });

  } catch (err) {
    console.error("Socket connection error:", err.message);
    socket.disconnect();
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("Server running on port " + PORT));