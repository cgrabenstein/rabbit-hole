import { useEffect, useState } from "react";
import "./Toast.css";

export interface ToastMessage {
  id: number;
  text: string;
  variant: "success" | "error";
}

interface ToastProps {
  message: ToastMessage;
  onDone: (id: number) => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone(message.id), 300);
    }, 3_000);

    return () => clearTimeout(timer);
  }, [message.id, onDone]);

  return (
    <div
      className={`toast toast--${message.variant} ${visible ? "toast--visible" : ""}`}
    >
      <span className="toast__icon">{message.variant === "success" ? "✓" : "✕"}</span>
      <span className="toast__text">{message.text}</span>
    </div>
  );
}
