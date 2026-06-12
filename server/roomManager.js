// Tracks which users are in which rooms (in-memory, socket-based)
// roomId → Set of { socketId, username }

const roomUsers = {};

function joinRoom(roomId, socketId, username) {
  if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
  roomUsers[roomId].add(JSON.stringify({ socketId, username }));
}

function leaveRoom(roomId, socketId) {
  if (!roomUsers[roomId]) return;
  for (const entry of roomUsers[roomId]) {
    const parsed = JSON.parse(entry);
    if (parsed.socketId === socketId) {
      roomUsers[roomId].delete(entry);
      break;
    }
  }
  if (roomUsers[roomId].size === 0) {
    delete roomUsers[roomId];
  }
}

function getUsers(roomId) {
  if (!roomUsers[roomId]) return [];
  return [...roomUsers[roomId]].map((e) => JSON.parse(e));
}

function getUserCount(roomId) {
  return roomUsers[roomId] ? roomUsers[roomId].size : 0;
}

// Find which room a socket is in
function findRoomBySocket(socketId) {
  for (const [roomId, users] of Object.entries(roomUsers)) {
    for (const entry of users) {
      const parsed = JSON.parse(entry);
      if (parsed.socketId === socketId) return { roomId, ...parsed };
    }
  }
  return null;
}

module.exports = { joinRoom, leaveRoom, getUsers, getUserCount, findRoomBySocket };
