import styles from "./UserPresence.module.css";

const COLORS = [
  "#6c63ff", "#4ecdc4", "#ff6b6b", "#ffd93d",
  "#6bcb77", "#ff9f43", "#a29bfe", "#fd79a8",
];

function getColor(username) {
  let hash = 0;
  for (const ch of username) hash = (hash + ch.charCodeAt(0)) % COLORS.length;
  return COLORS[hash];
}

function Avatar({ username }) {
  return (
    <div
      className={styles.avatar}
      style={{ background: getColor(username) }}
      title={username}
    >
      {username[0].toUpperCase()}
    </div>
  );
}

export default function UserPresence({ users, roomId, currentUser, host }) {
  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={styles.roomInfo}>
          <span className={styles.roomLabel}>Room code</span>
          <span className={styles.roomCode}>{roomId}</span>
          <button
            className={styles.copyBtn}
            onClick={() => navigator.clipboard.writeText(roomId)}
            title="Copy code"
          >
            📋
          </button>
        </div>
        <span className={styles.hostBadge}>Host: {host}</span>
      </div>

      <div className={styles.usersSection}>
        <span className={styles.label}>In room ({users.length})</span>
        <div className={styles.avatarRow}>
          {users.map((u) => (
            <div key={u.socketId} className={styles.userChip}>
              <Avatar username={u.username} />
              <span className={styles.userName}>
                {u.username}
                {u.username === currentUser && " (you)"}
                {u.username === host && " 👑"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
