/**
 * Feedback.jsx
 * ------------
 * Small shared presentational components used across pages for consistent
 * error, loading, and empty-state handling.
 */

import { useEffect } from "react";

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="flex items-start justify-between gap-4 bg-rose-soft border border-rose/30 text-ink-900 rounded-xl px-4 py-3 mb-4">
      <div className="flex gap-2 items-start">
        <span className="text-rose font-bold" aria-hidden="true">
          !
        </span>
        <p className="text-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-rose underline underline-offset-2 shrink-0"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-3 text-ink-600 py-10 justify-center">
      <span className="w-4 h-4 rounded-full border-2 border-ink-600/30 border-t-signal animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-14 px-6">
      <p className="font-display text-xl text-ink-900 mb-1">{title}</p>
      {subtitle && <p className="text-sm text-ink-600 max-w-md mx-auto">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Toast({ message, tone = "signal", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;
  const toneClasses =
    tone === "rose"
      ? "bg-rose text-white"
      : tone === "amber"
      ? "bg-amber text-ink-950"
      : "bg-signal text-ink-950";
  return (
    <div
      className={`fixed bottom-6 right-6 ${toneClasses} px-4 py-3 rounded-lg shadow-card text-sm font-medium flex items-center gap-3 z-50`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
