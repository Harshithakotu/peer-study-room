import styles from "./PomodoroTimer.module.css";

export default function PomodoroTimer({ timerState, onStart, onPause, onReset, isHost }) {
  const { timeLeft = 0, phase = "focus", isRunning = false, pomodoroCount = 0 } = timerState;

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  // Progress: 0 to 1
  const totalSecs = phase === "focus" ? 25 * 60 : 5 * 60;
  const progress = 1 - timeLeft / totalSecs;
  const circumference = 2 * Math.PI * 90; // radius=90
  const strokeDashoffset = circumference * (1 - progress);

  const phaseColor = phase === "focus" ? "#6c63ff" : "#4ecdc4";
  const phaseLabel = phase === "focus" ? "Focus" : "Break";

  return (
    <div className={styles.container}>
      <div className={styles.phaseLabel} style={{ color: phaseColor }}>
        {phaseLabel} session
      </div>

      <div className={styles.ring}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          {/* Background ring */}
          <circle
            cx="110" cy="110" r="90"
            fill="none"
            stroke="#2a2a3a"
            strokeWidth="8"
          />
          {/* Progress ring */}
          <circle
            cx="110" cy="110" r="90"
            fill="none"
            stroke={phaseColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 110 110)"
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.5s" }}
          />
        </svg>
        <div className={styles.timerDisplay}>
          <span className={styles.time}>{minutes}:{seconds}</span>
          <span className={styles.pomodoros}>🍅 {pomodoroCount}</span>
        </div>
      </div>

      {isHost ? (
        <div className={styles.controls}>
          {!isRunning ? (
            <button
              className={styles.startBtn}
              onClick={onStart}
              style={{ background: phaseColor }}
            >
              ▶ Start
            </button>
          ) : (
            <button className={styles.pauseBtn} onClick={onPause}>
              ⏸ Pause
            </button>
          )}
          <button className={styles.resetBtn} onClick={onReset}>
            ↺ Reset
          </button>
        </div>
      ) : (
        <p className={styles.guestNote}>Only the host can control the timer</p>
      )}
    </div>
  );
}
