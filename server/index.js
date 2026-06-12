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
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOriginFn = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error("CORS blocked: " + origin));
};

const io = new Server(server, {
  cors: { origin: corsOriginFn, methods: ["GET", "POST"], credentials: true },
});

app.use(cors({ origin: corsOriginFn, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.get("/", (req, res) => res.json({ message: "Study Room API running" }));

// ── Helper: plain object from Mongoose doc ──
// Prevents "Maximum call stack" crash from circular refs in Socket.io serializer
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

// ── Socket auth ───────────────────────────
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

// ── Socket events ─────────────────────────
io.on("connection", async (socket) => {
  const user = await User.findById(socket.userId);
  if (!user) return socket.disconnect();
  socket.username = user.username;
  console.log(user.username + " connected [" + socket.id + "]");

  // JOIN ROOM
  socket.on("room:join", async ({ roomId }) => {
    const upperRoomId = roomId.toUpperCase();
    const room = await Room.findOne({ roomId: upperRoomId });
    if (!room) { socket.emit("error", { message: "Room not found" }); return; }

    socket.join(upperRoomId);
    socket.currentRoom = upperRoomId;
    roomManager.joinRoom(upperRoomId, socket.id, socket.username);
    timer.createRoom(upperRoomId, room.focusDuration, room.breakDuration);

    // ✅ Use toPlain() to strip Mongoose circular refs before emitting
    socket.emit("timer:sync", timer.getState(upperRoomId));
    socket.emit("users:list", roomManager.getUsers(upperRoomId));
    socket.emit("todos:list", toPlain(room.todos));

    socket.to(upperRoomId).emit("user:joined", {
      username: socket.username,
      users: roomManager.getUsers(upperRoomId),
    });
    socket.to(upperRoomId).emit("chat:message", systemMsg(socket.username + " joined the room"));
    console.log(socket.username + " joined room " + upperRoomId);
  });

  // TIMER
  socket.on("timer:start", () => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    timer.startTimer(roomId, io, async (rId) => {
      await Room.findOneAndUpdate(
        { roomId: rId },
        { $push: { sessions: { phase: "focus", completedAt: new Date() } } }
      );
      await User.findByIdAndUpdate(socket.userId, {
        $inc: { totalPomodoros: 1, totalFocusMinutes: 25 },
      });
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

  // TODOS
  socket.on("todo:add", async ({ text }) => {
    const roomId = socket.currentRoom;
    if (!roomId || !text || !text.trim()) return;
    const updatedRoom = await Room.findOneAndUpdate(
      { roomId },
      { $push: { todos: { text: text.trim(), done: false, createdBy: socket.username } } },
      { new: true }
    );
    const todos = toPlain(updatedRoom.todos);
    const addedTodo = todos[todos.length - 1];
    io.to(roomId).emit("todo:added", addedTodo);   // ✅ plain object
  });

  socket.on("todo:toggle", async ({ todoId }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    const room = await Room.findOne({ roomId });
    const todo = room.todos.id(todoId);
    if (!todo) return;
    todo.done = !todo.done;
    await room.save();
    io.to(roomId).emit("todo:updated", { todoId, done: todo.done });
  });

  socket.on("todo:delete", async ({ todoId }) => {
    const roomId = socket.currentRoom;
    if (!roomId) return;
    await Room.findOneAndUpdate({ roomId }, { $pull: { todos: { _id: todoId } } });
    io.to(roomId).emit("todo:deleted", { todoId });
  });

  // CHAT
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

  // DISCONNECT
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
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("Server running on port " + PORT));
