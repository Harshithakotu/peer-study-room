import { useState, useEffect, useRef } from "react";
import styles from "./ChatBox.module.css";

const COLORS = [
  "#6c63ff", "#4ecdc4", "#ff6b6b", "#ffd93d",
  "#6bcb77", "#ff9f43", "#a29bfe", "#fd79a8",
];

function getUserColor(username) {
  let hash = 0;
  for (const ch of username) hash = (hash + ch.charCodeAt(0)) % COLORS.length;
  return COLORS[hash];
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatBox({ socket, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  // Keep ref in sync so the socket listener always has latest value
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!isOpenRef.current) {
        setUnread((n) => n + 1);
      }
    };

    socket.on("chat:message", handleMessage);
    return () => socket.off("chat:message", handleMessage);
  }, [socket]);

  // Auto-scroll to bottom when new messages arrive and chat is open
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const openChat = () => {
    setIsOpen(true);
    setUnread(0);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      inputRef.current?.focus();
    }, 50);
  };

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit("chat:send", { text: input.trim() });
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Collapsed tab */}
      {!isOpen && (
        <button className={styles.tab} onClick={openChat}>
          💬 Chat
          {unread > 0 && <span className={styles.badge}>{unread}</span>}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.title}>💬 Room chat</span>
            <button
              className={styles.collapseBtn}
              onClick={() => setIsOpen(false)}
              title="Collapse"
            >
              ↓
            </button>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.empty}>
                No messages yet. Say hi! 👋
              </p>
            )}

            {messages.map((msg) =>
              msg.type === "system" ? (
                <div key={msg.id} className={styles.systemMsg}>
                  {msg.text}
                </div>
              ) : (
                <div
                  key={msg.id}
                  className={`${styles.msgRow} ${msg.username === currentUser ? styles.ownRow : ""}`}
                >
                  {/* Avatar — only for others */}
                  {msg.username !== currentUser && (
                    <div
                      className={styles.avatar}
                      style={{ background: getUserColor(msg.username) }}
                      title={msg.username}
                    >
                      {msg.username[0].toUpperCase()}
                    </div>
                  )}

                  <div className={styles.bubble}>
                    {/* Username label — only for others */}
                    {msg.username !== currentUser && (
                      <span
                        className={styles.sender}
                        style={{ color: getUserColor(msg.username) }}
                      >
                        {msg.username}
                      </span>
                    )}
                    <div
                      className={`${styles.text} ${msg.username === currentUser ? styles.ownText : ""}`}
                    >
                      {msg.text}
                    </div>
                    <span className={styles.time}>{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="Type a message... (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={300}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={!input.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
