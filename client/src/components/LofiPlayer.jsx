import { useState, useRef, useEffect } from "react";
import styles from "./LofiPlayer.module.css";

// Free-to-use lo-fi streams (publicly hosted MP3/streams)
const STATIONS = [
  {
    name: "Lo-fi Chill",
    url: "https://stream.zeno.fm/f3wvbbqmdg8uv",
    emoji: "🌙",
  },
  {
    name: "Jazz Café",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    emoji: "☕",
  },
  {
    name: "Rainy Day",
    url: "https://stream.zeno.fm/yn65m2gsc7zuv",
    emoji: "🌧️",
  },
  {
    name: "Study Beats",
    url: "https://stream.zeno.fm/q9uuvmfnqtzuv",
    emoji: "📖",
  },
];

export default function LofiPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.crossOrigin = "anonymous";

    audio.addEventListener("canplay", () => setLoading(false));
    audio.addEventListener("waiting", () => setLoading(true));
    audio.addEventListener("error", () => {
      setLoading(false);
      setPlaying(false);
    });

    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      audio.src = "";
      setPlaying(false);
    } else {
      setLoading(true);
      audio.src = STATIONS[currentStation].url;
      audio.play()
        .then(() => setPlaying(true))
        .catch(() => { setLoading(false); setPlaying(false); });
    }
  };

  const switchStation = (idx) => {
    const audio = audioRef.current;
    setCurrentStation(idx);
    if (playing) {
      audio.pause();
      setLoading(true);
      audio.src = STATIONS[idx].url;
      audio.play()
        .then(() => setPlaying(true))
        .catch(() => { setLoading(false); setPlaying(false); });
    }
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const station = STATIONS[currentStation];

  return (
    <div className={styles.wrapper}>
      {/* Floating toggle button */}
      <button
        className={`${styles.floatBtn} ${playing ? styles.floatBtnPlaying : ""}`}
        onClick={() => setIsOpen((o) => !o)}
        title="Lo-fi music"
      >
        {playing ? "🎵" : "🎵"}
        {playing && <span className={styles.playingDot} />}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Lo-fi radio</span>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* Now playing */}
          <div className={styles.nowPlaying}>
            <span className={styles.stationEmoji}>{station.emoji}</span>
            <div>
              <div className={styles.stationName}>{station.name}</div>
              <div className={styles.statusText}>
                {loading ? "Connecting..." : playing ? "▶ Live stream" : "Paused"}
              </div>
            </div>
            <button
              className={`${styles.playBtn} ${playing ? styles.pauseBtn : ""}`}
              onClick={togglePlay}
            >
              {loading ? "⟳" : playing ? "⏸" : "▶"}
            </button>
          </div>

          {/* Station list */}
          <div className={styles.stations}>
            {STATIONS.map((s, i) => (
              <button
                key={i}
                className={`${styles.stationBtn} ${i === currentStation ? styles.activeStation : ""}`}
                onClick={() => switchStation(i)}
              >
                <span>{s.emoji}</span>
                <span>{s.name}</span>
                {i === currentStation && playing && <span className={styles.activeDot} />}
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className={styles.volumeRow}>
            <span className={styles.volIcon}>{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolume}
              className={styles.volumeSlider}
            />
            <span className={styles.volNum}>{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
