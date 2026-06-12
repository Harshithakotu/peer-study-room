import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../socket";
import PomodoroTimer from "../components/PomodoroTimer";
import TodoList from "../components/TodoList";
import UserPresence from "../components/UserPresence";
import ChatBox from "../components/ChatBox";
import LofiPlayer from "../components/LofiPlayer";
import styles from "./StudyRoom.module.css";

export default function StudyRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const joinedRef = useRef(false);

  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [todos, setTodos] = useState([]);
  const [timerState, setTimerState] = useState({
    phase: "focus", timeLeft: 25 * 60, isRunning: false, pomodoroCount: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  const notify = useCallback((msg, type = "info") => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 3000);
  }, []);

  // Load room details via REST
  useEffect(() => {
    axios.get("/api/rooms/" + roomId)
      .then((res) => setRoom(res.data))
      .catch(() => {
        setError("Room not found");
        setTimeout(() => navigate("/"), 2000);
      });
  }, [roomId, navigate]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room) return;

    // Guard against double join (React StrictMode / re-renders)
    if (joinedRef.current) return;
    joinedRef.current = true;

    socket.emit("room:join", { roomId });

    socket.on("timer:sync",         (s) => setTimerState(s));
    socket.on("timer:tick",         (s) => setTimerState(s));
    socket.on("timer:paused",       (s) => setTimerState(s));
    socket.on("timer:phase-change", ({ phase, timeLeft, pomodoroCount }) => {
      setTimerState((p) => ({ ...p, phase, timeLeft, isRunning: false, pomodoroCount }));
      notify(phase === "break" ? "🍅 Focus done! Take a break." : "⏱ Break over! Back to focus.", "success");
      if (Notification.permission === "granted") {
        new Notification(phase === "break" ? "Pomodoro complete! Time for a break." : "Break over — get back to it!");
      }
    });

    socket.on("users:list",  (list)                  => setUsers(list));
    socket.on("user:joined", ({ username, users: u }) => { setUsers(u); notify(username + " joined"); });
    socket.on("user:left",   ({ username, users: u }) => { setUsers(u); notify(username + " left"); });

    socket.on("todos:list",   (list)              => setTodos(list));
    socket.on("todo:added",   (todo)              => setTodos((p) => [...p, todo]));
    socket.on("todo:updated", ({ todoId, done })  => setTodos((p) => p.map((t) => t._id === todoId ? { ...t, done } : t)));
    socket.on("todo:deleted", ({ todoId })        => setTodos((p) => p.filter((t) => t._id !== todoId)));

    socket.on("error", ({ message }) => setError(message));

    if (Notification.permission === "default") Notification.requestPermission();

    return () => {
      [
        "timer:sync","timer:tick","timer:paused","timer:phase-change",
        "users:list","user:joined","user:left",
        "todos:list","todo:added","todo:updated","todo:deleted","error",
      ].forEach((ev) => socket.off(ev));
      joinedRef.current = false;
    };
  }, [room, roomId, notify]);

  const socket = getSocket();
  const isHost = room?.host === user?.username;

  if (error) return <div className={styles.center}><p style={{ color:"#ff6b6b" }}>{error}</p></div>;
  if (!room)  return <div className={styles.center}>Loading room...</div>;

  return (
    <div className={styles.page}>

      {/* Top bar */}
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/")}>← Lobby</button>
        <span className={styles.roomName}>{room.name}</span>
        <span />
      </header>

      {/* User presence strip */}
      <UserPresence users={users} roomId={roomId.toUpperCase()} currentUser={user?.username} host={room.host} />

      {/* Toast notifications */}
      <div className={styles.notifications}>
        {notifications.map((n) => (
          <div key={n.id} className={styles.notif + " " + (styles[n.type] || "")}>
            {n.msg}
          </div>
        ))}
      </div>

      {/* Three-column layout */}
      <div className={styles.main}>

        {/* Left — Timer */}
        <div className={styles.timerPanel}>
          <PomodoroTimer
            timerState={timerState}
            onStart={() => socket?.emit("timer:start")}
            onPause={() => socket?.emit("timer:pause")}
            onReset={() => socket?.emit("timer:reset")}
            isHost={isHost}
          />
          {!isHost && <p className={styles.syncNote}>✅ Synced with all members</p>}
        </div>

        {/* Middle — Todos */}
        <div className={styles.todoPanel}>
          <TodoList
            todos={todos}
            onAdd={(text)    => socket?.emit("todo:add",    { text })}
            onToggle={(id)   => socket?.emit("todo:toggle", { todoId: id })}
            onDelete={(id)   => socket?.emit("todo:delete", { todoId: id })}
          />
        </div>

        {/* Right — Chat */}
        <div className={styles.chatPanel}>
          <ChatBox socket={socket} currentUser={user?.username} />
        </div>

      </div>

      {/* Lo-fi player — floating bottom-right */}
      <LofiPlayer />

    </div>
  );
}
