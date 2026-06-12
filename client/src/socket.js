import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  // If already connected with same token, reuse it
  if (socket && socket.connected) return socket;
  // If exists but disconnected, clean up first
  if (socket) { socket.disconnect(); socket = null; }

  socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:3001", {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    // Prevent duplicate connections on React StrictMode double-invoke
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => console.log("Socket connected:", socket.id));
  socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason));
  socket.on("connect_error", (err) => console.error("Socket error:", err.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
