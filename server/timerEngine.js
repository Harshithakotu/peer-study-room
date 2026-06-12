// In-memory store for active room timers
// roomId → { phase, timeLeft, isRunning, interval, focusSecs, breakSecs, pomodoroCount }
const rooms = {};

function createRoom(roomId, focusMins = 25, breakMins = 5) {
  if (rooms[roomId]) return; // already exists
  rooms[roomId] = {
    phase: "focus",
    timeLeft: focusMins * 60,
    isRunning: false,
    interval: null,
    focusSecs: focusMins * 60,
    breakSecs: breakMins * 60,
    pomodoroCount: 0,
  };
}

function startTimer(roomId, io, onPomodoroComplete) {
  const room = rooms[roomId];
  if (!room || room.isRunning) return;

  room.isRunning = true;

  room.interval = setInterval(() => {
    room.timeLeft -= 1;

    // Broadcast every second to all clients in the room
    io.to(roomId).emit("timer:tick", {
      timeLeft: room.timeLeft,
      phase: room.phase,
      isRunning: true,
      pomodoroCount: room.pomodoroCount,
    });

    // Phase ended
    if (room.timeLeft <= 0) {
      clearInterval(room.interval);
      room.isRunning = false;

      if (room.phase === "focus") {
        room.pomodoroCount += 1;
        onPomodoroComplete && onPomodoroComplete(roomId, room.pomodoroCount);
        room.phase = "break";
        room.timeLeft = room.breakSecs;
      } else {
        room.phase = "focus";
        room.timeLeft = room.focusSecs;
      }

      io.to(roomId).emit("timer:phase-change", {
        phase: room.phase,
        timeLeft: room.timeLeft,
        pomodoroCount: room.pomodoroCount,
      });
    }
  }, 1000);
}

function pauseTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearInterval(room.interval);
  room.isRunning = false;
}

function resetTimer(roomId, io) {
  const room = rooms[roomId];
  if (!room) return;
  clearInterval(room.interval);
  room.isRunning = false;
  room.phase = "focus";
  room.timeLeft = room.focusSecs;
  room.pomodoroCount = 0;

  io.to(roomId).emit("timer:tick", {
    timeLeft: room.timeLeft,
    phase: room.phase,
    isRunning: false,
    pomodoroCount: 0,
  });
}

function getState(roomId) {
  return rooms[roomId] || null;
}

function deleteRoom(roomId) {
  if (rooms[roomId]) {
    clearInterval(rooms[roomId].interval);
    delete rooms[roomId];
  }
}

module.exports = {
  createRoom,
  startTimer,
  pauseTimer,
  resetTimer,
  getState,
  deleteRoom,
};
