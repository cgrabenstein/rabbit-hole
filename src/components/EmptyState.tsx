import type { ReactNode } from "react";
import "./EmptyState.css";

interface EmptyStateProps {
  children?: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">🕳️</div>
      <h2 className="empty-state__heading">Your graph is empty</h2>
      <p className="empty-state__text">
        Paste a URL above to capture your first source.
        <br />
        The graph will grow as you add more.
      </p>
      {children}
    </div>
  );
}
