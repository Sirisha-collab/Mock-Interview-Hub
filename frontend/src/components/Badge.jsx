const palettes = {
  neutral: "bg-ink-800/5 text-ink-800",
  signal: "bg-signal-soft text-signal-dim",
  amber: "bg-amber-soft text-amber",
  rose: "bg-rose-soft text-rose",
};

export default function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${palettes[tone] || palettes.neutral} ${className}`}
    >
      {children}
    </span>
  );
}

// Maps a practice log / question status to a consistent badge tone + label.
export function statusBadge(status) {
  switch (status) {
    case "answered":
      return { tone: "signal", label: "Answered" };
    case "skipped":
      return { tone: "amber", label: "Skipped" };
    case "shown":
      return { tone: "neutral", label: "Shown" };
    default:
      return { tone: "neutral", label: status };
  }
}
