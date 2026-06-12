import { useState } from "react";
import styles from "./TodoList.module.css";

export default function TodoList({ todos, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  const done = todos.filter((t) => t.done).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Shared todos</span>
        <span className={styles.count}>
          {done}/{todos.length} done
        </span>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          className={styles.input}
          placeholder="Add a task..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={100}
        />
        <button className={styles.addBtn} type="submit">
          +
        </button>
      </form>

      <div className={styles.list}>
        {todos.length === 0 && (
          <p className={styles.empty}>No tasks yet. Add one above!</p>
        )}
        {todos.map((todo) => (
          <div key={todo._id} className={`${styles.item} ${todo.done ? styles.done : ""}`}>
            <button
              className={styles.checkbox}
              onClick={() => onToggle(todo._id)}
              aria-label="toggle"
            >
              {todo.done ? "✓" : ""}
            </button>
            <span className={styles.todoText}>{todo.text}</span>
            <span className={styles.createdBy}>{todo.createdBy}</span>
            <button
              className={styles.deleteBtn}
              onClick={() => onDelete(todo._id)}
              aria-label="delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
