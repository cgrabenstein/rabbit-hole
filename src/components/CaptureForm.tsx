import { useState, type FormEvent } from "react";
import { fetchTitle } from "../api/fetchTitle";
import { addSource } from "../db";
import "./CaptureForm.css";

interface CaptureFormProps {
  onCaptured: (title: string) => void;
  onError: (msg: string) => void;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function CaptureForm({ onCaptured, onError }: CaptureFormProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isValidUrl(trimmed)) {
      onError("Please enter a valid URL (starting with http:// or https://)");
      return;
    }

    setLoading(true);
    try {
      const { title } = await fetchTitle(trimmed);
      await addSource({ url: trimmed, title, createdAt: new Date().toISOString() });
      setUrl("");
      onCaptured(title);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="capture-form" onSubmit={handleSubmit}>
      <div className="capture-form__input-row">
        <input
          className="capture-form__input"
          type="url"
          placeholder="Paste a URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button
          className="capture-form__button"
          type="submit"
          disabled={loading || !url.trim()}
        >
          {loading ? "…" : "Capture"}
        </button>
      </div>
    </form>
  );
}
