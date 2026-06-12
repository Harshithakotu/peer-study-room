import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import styles from "./Lobby.module.css";

export default function Lobby() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("join"); // 'join' | 'create' | 'browse'
  const [joinCode, setJoinCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [isPrivate, setIsPrivate] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "browse") {
      axios.get("/api/rooms/public").then((res) => setPublicRooms(res.data));
    }
  }, [tab]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/rooms", {
        name: roomName || `${user.username}'s Room`,
        isPrivate,
        focusDuration: Number(focusDuration),
        breakDuration: Number(breakDuration),
      });
      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLogo}>📚 Study Room</div>
        <div className={styles.headerRight}>
          <span className={styles.username}>👤 {user?.username}</span>
          <button className={styles.logoutBtn} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <div className={styles.hero}>
        <h1>Study better, together</h1>
        <p>Join a room, focus with friends, and crush your goals.</p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{user?.totalPomodoros ?? 0}</span>
          <span className={styles.statLabel}>Pomodoros done</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{user?.totalFocusMinutes ?? 0}</span>
          <span className={styles.statLabel}>Focus minutes</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tabs}>
          {["join", "create", "browse"].map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ""}`}
              onClick={() => { setTab(t); setError(""); }}
            >
              {t === "join" ? "Join room" : t === "create" ? "Create room" : "Browse public"}
            </button>
          ))}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {tab === "join" && (
          <form onSubmit={handleJoin} className={styles.form}>
            <label className={styles.label}>Enter room code</label>
            <input
              className={styles.input}
              placeholder="e.g. AB12CD"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
            />
            <button className={styles.btn} type="submit">
              Join room →
            </button>
          </form>
        )}

        {tab === "create" && (
          <form onSubmit={handleCreate} className={styles.form}>
            <label className={styles.label}>Room name</label>
            <input
              className={styles.input}
              placeholder={`${user?.username}'s Room`}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
            />
            <div className={styles.row}>
              <div className={styles.halfField}>
                <label className={styles.label}>Focus (mins)</label>
                <input
                  className={styles.input}
                  type="number"
                  min={5}
                  max={60}
                  value={focusDuration}
                  onChange={(e) => setFocusDuration(e.target.value)}
                />
              </div>
              <div className={styles.halfField}>
                <label className={styles.label}>Break (mins)</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={30}
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(e.target.value)}
                />
              </div>
            </div>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Private room (invite-only)
            </label>
            <button className={styles.btn} disabled={loading}>
              {loading ? "Creating..." : "Create room →"}
            </button>
          </form>
        )}

        {tab === "browse" && (
          <div className={styles.roomList}>
            {publicRooms.length === 0 ? (
              <p className={styles.empty}>No public rooms. Create one!</p>
            ) : (
              publicRooms.map((room) => (
                <div
                  key={room.roomId}
                  className={styles.roomCard}
                  onClick={() => navigate(`/room/${room.roomId}`)}
                >
                  <div className={styles.roomInfo}>
                    <span className={styles.roomName}>{room.name}</span>
                    <span className={styles.roomHost}>by {room.host}</span>
                  </div>
                  <div className={styles.roomMeta}>
                    <span>{room.focusDuration}min focus</span>
                    <span className={styles.roomCode}>{room.roomId}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
